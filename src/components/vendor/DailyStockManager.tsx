import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { toast } from 'sonner';
import { Package, AlertTriangle, CheckCircle, XCircle, Calendar, Settings, ChevronDown, ChevronUp, Copy, Pencil } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  is_available: boolean;
}

interface DailyStock {
  id: string;
  menu_item_id: string;
  date: string;
  total_quantity: number;
  remaining_quantity: number;
  status: 'available' | 'unavailable';
}

interface DailyStockManagerProps {
  canteenId: string;
  stockMode: 'simple' | 'daily';
  onStockModeChange: (mode: 'simple' | 'daily') => void;
}

export function DailyStockManager({ canteenId, stockMode, onStockModeChange }: DailyStockManagerProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [todayStock, setTodayStock] = useState<DailyStock[]>([]);
  const [stockInputs, setStockInputs] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasStockForToday, setHasStockForToday] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasYesterdayStock, setHasYesterdayStock] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  useEffect(() => {
    fetchData();

    // Subscribe to real-time updates on daily_stock for this canteen
    const channel = supabase
      .channel(`vendor-daily-stock-${canteenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_stock',
          filter: `canteen_id=eq.${canteenId}`,
        },
        (payload) => {
          const record = payload.new as DailyStock & { canteen_id: string; date: string };
          
          // Only update if the change is for today's date
          if (record && record.date === today) {
            setTodayStock(prev => {
              const existing = prev.find(s => s.id === record.id);
              if (existing) {
                // Update existing record
                return prev.map(s => s.id === record.id ? {
                  ...record,
                  status: record.status as 'available' | 'unavailable'
                } : s);
              } else if (payload.eventType === 'INSERT') {
                // Add new record
                return [...prev, {
                  ...record,
                  status: record.status as 'available' | 'unavailable'
                }];
              }
              return prev;
            });
          }
          
          // Handle DELETE event
          if (payload.eventType === 'DELETE' && payload.old) {
            const oldRecord = payload.old as { id: string };
            setTodayStock(prev => prev.filter(s => s.id !== oldRecord.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [canteenId, today]);

  const fetchData = async () => {
    setIsLoading(true);
    
    // Fetch menu items
    const { data: items, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, name, category, price, is_available')
      .eq('canteen_id', canteenId)
      .order('category', { ascending: true });

    if (itemsError) {
      console.error('Error fetching menu items:', itemsError);
      toast.error('Failed to load menu items');
      setIsLoading(false);
      return;
    }

    setMenuItems(items || []);

    // Fetch today's stock
    const { data: stock, error: stockError } = await supabase
      .from('daily_stock')
      .select('*')
      .eq('canteen_id', canteenId)
      .eq('date', today);

    if (stockError) {
      console.error('Error fetching daily stock:', stockError);
    } else {
      const typedStock = (stock || []).map(s => ({
        ...s,
        status: s.status as 'available' | 'unavailable'
      }));
      setTodayStock(typedStock);
      setHasStockForToday(typedStock.length > 0);
      
      // Initialize stock inputs with existing quantities
      const inputs: Record<string, number> = {};
      typedStock.forEach(s => {
        inputs[s.menu_item_id] = s.total_quantity;
      });
      setStockInputs(inputs);
    }

    // Check if yesterday has stock data
    const { data: yesterdayData } = await supabase
      .from('daily_stock')
      .select('id')
      .eq('canteen_id', canteenId)
      .eq('date', yesterday)
      .limit(1);
    
    setHasYesterdayStock((yesterdayData?.length || 0) > 0);

    setIsLoading(false);
  };

  const handleCopyYesterdayStock = async () => {
    setIsCopying(true);
    
    const { data: yesterdayStock, error } = await supabase
      .from('daily_stock')
      .select('menu_item_id, total_quantity')
      .eq('canteen_id', canteenId)
      .eq('date', yesterday);

    if (error) {
      toast.error('Failed to fetch yesterday\'s stock');
      setIsCopying(false);
      return;
    }

    if (!yesterdayStock || yesterdayStock.length === 0) {
      toast.error('No stock data from yesterday');
      setIsCopying(false);
      return;
    }

    const inputs: Record<string, number> = {};
    yesterdayStock.forEach(s => {
      inputs[s.menu_item_id] = s.total_quantity;
    });
    setStockInputs(inputs);
    toast.success('Copied yesterday\'s stock quantities');
    setIsCopying(false);
  };

  const handleStockModeToggle = async (enabled: boolean) => {
    const newMode = enabled ? 'daily' : 'simple';
    
    const { error } = await supabase
      .from('canteens')
      .update({ stock_mode: newMode })
      .eq('id', canteenId);

    if (error) {
      toast.error('Failed to update stock mode');
      return;
    }

    onStockModeChange(newMode);
    toast.success(`Stock mode changed to ${newMode === 'daily' ? 'Daily Stock' : 'Simple'}`);
  };

  const handleStockInputChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setStockInputs(prev => ({ ...prev, [itemId]: Math.max(0, numValue) }));
  };

  const handleSetTodayStock = async () => {
    setIsSaving(true);

    const stockRecords = menuItems
      .filter(item => stockInputs[item.id] !== undefined && stockInputs[item.id] > 0)
      .map(item => ({
        canteen_id: canteenId,
        menu_item_id: item.id,
        date: today,
        total_quantity: stockInputs[item.id],
        remaining_quantity: stockInputs[item.id],
        status: 'available' as const
      }));

    if (stockRecords.length === 0) {
      toast.error('Please set quantity for at least one item');
      setIsSaving(false);
      return;
    }

    // Delete existing stock for today first
    await supabase
      .from('daily_stock')
      .delete()
      .eq('canteen_id', canteenId)
      .eq('date', today);

    // Insert new stock records
    const { error } = await supabase
      .from('daily_stock')
      .insert(stockRecords);

    if (error) {
      console.error('Error setting daily stock:', error);
      toast.error('Failed to save stock');
    } else {
      toast.success(hasStockForToday ? 'Stock updated!' : 'Today\'s stock has been set!');
      setIsEditing(false);
      await fetchData();
    }

    setIsSaving(false);
  };

  const handleMarkUnavailable = async (stockId: string) => {
    const { error } = await supabase
      .from('daily_stock')
      .update({ status: 'unavailable', remaining_quantity: 0 })
      .eq('id', stockId);

    if (error) {
      toast.error('Failed to mark as unavailable');
    } else {
      toast.success('Item marked as unavailable for today');
      await fetchData();
    }
  };

  const getStockForItem = (itemId: string) => {
    return todayStock.find(s => s.menu_item_id === itemId);
  };

  // Group menu items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 flex justify-center">
          <LoadingSpinner text="Loading stock settings..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Stock Mode Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-mcd-red" />
              <CardTitle className="text-lg">Stock Management Mode</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="stock-mode" className="text-sm text-muted-foreground">
                {stockMode === 'simple' ? 'Simple' : 'Daily Stock'}
              </Label>
              <Switch
                id="stock-mode"
                checked={stockMode === 'daily'}
                onCheckedChange={handleStockModeToggle}
              />
            </div>
          </div>
          <CardDescription>
            {stockMode === 'simple' 
              ? 'Items are always available. Manually mark items unavailable when needed.'
              : 'Set daily quantities. Orders are blocked when stock runs out.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Daily Stock Management (only shown in daily mode) */}
      {stockMode === 'daily' && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-3 cursor-pointer hover:bg-muted/50 transition-colors rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-mcd-red" />
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Today's Stock
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </CardTitle>
                      {!isExpanded && (
                        <CardDescription className="text-xs mt-0.5">
                          {hasStockForToday 
                            ? `${todayStock.filter(s => s.status === 'available').length} items available` 
                            : 'Stock not set yet'}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  {hasStockForToday ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Set
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {!hasStockForToday || isEditing ? (
                // Stock Setup/Edit Form
                <div className="space-y-4">
                  {!hasStockForToday && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">Stock not set for today</p>
                        <p className="text-xs text-amber-700">Set quantities below to start accepting orders.</p>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">Editing stock quantities</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditing(false)}
                        className="text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  )}

                {hasYesterdayStock && !hasStockForToday && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyYesterdayStock}
                    disabled={isCopying}
                    className="w-full border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {isCopying ? 'Copying...' : "Copy Yesterday's Stock"}
                  </Button>
                )}

                {Object.entries(groupedItems).map(([category, items]) => (
                  <div key={category} className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="grid gap-2">
                      {items.map(item => (
                        <div key={item.id} className="flex items-center justify-between bg-mcd-selected/50 rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">₹{item.price}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              placeholder="Qty"
                              value={stockInputs[item.id] || ''}
                              onChange={(e) => handleStockInputChange(item.id, e.target.value)}
                              className="w-20 h-8 text-center"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button 
                  onClick={handleSetTodayStock}
                  disabled={isSaving}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  {isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : "Set Today's Stock")}
                </Button>
              </div>
              ) : (
                // Stock Status View
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit Stock
                    </Button>
                  </div>
                {Object.entries(groupedItems).map(([category, items]) => {
                  const categoryHasStock = items.some(item => getStockForItem(item.id));
                  if (!categoryHasStock) return null;
                  
                  return (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {category}
                      </h4>
                      <div className="grid gap-2">
                        {items.map(item => {
                          const stock = getStockForItem(item.id);
                          if (!stock) return null;
                          
                          const isSoldOut = stock.status === 'unavailable' || stock.remaining_quantity === 0;
                          const isLow = stock.remaining_quantity <= 5 && stock.remaining_quantity > 0;
                          
                          return (
                            <div 
                              key={item.id} 
                              className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                                isSoldOut ? 'bg-red-50' : isLow ? 'bg-amber-50' : 'bg-green-50'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {isSoldOut ? (
                                    <Badge variant="destructive" className="text-xs">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Sold Out
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs ${
                                        isLow 
                                          ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                          : 'bg-green-100 text-green-700 border-green-200'
                                      }`}
                                    >
                                      <Package className="h-3 w-3 mr-1" />
                                      {stock.remaining_quantity} / {stock.total_quantity} left
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {!isSoldOut && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleMarkUnavailable(stock.id)}
                                  className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  Mark Unavailable
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                  <p className="text-xs text-center text-muted-foreground pt-2">
                    Stock resets automatically at midnight
                  </p>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
      )}
    </div>
  );
}
