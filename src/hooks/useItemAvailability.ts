import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AvailabilityInfo {
  available: boolean;
  mode: 'simple' | 'daily';
  remaining?: number;
  reason?: string;
}

export function useItemAvailability(menuItemId: string, canteenId: string) {
  const [availability, setAvailability] = useState<AvailabilityInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      setIsLoading(true);
      
      // First check the canteen's stock mode
      const { data: canteen } = await supabase
        .from('canteens')
        .select('stock_mode')
        .eq('id', canteenId)
        .maybeSingle();

      if (!canteen || canteen.stock_mode === 'simple') {
        setAvailability({ available: true, mode: 'simple' });
        setIsLoading(false);
        return;
      }

      // For daily mode, check today's stock
      const today = new Date().toISOString().split('T')[0];
      const { data: stock } = await supabase
        .from('daily_stock')
        .select('remaining_quantity, status')
        .eq('menu_item_id', menuItemId)
        .eq('date', today)
        .maybeSingle();

      if (!stock) {
        setAvailability({ 
          available: false, 
          mode: 'daily', 
          reason: 'Stock not set for today' 
        });
      } else if (stock.status === 'unavailable' || stock.remaining_quantity === 0) {
        setAvailability({ 
          available: false, 
          mode: 'daily', 
          remaining: 0,
          reason: 'Sold out' 
        });
      } else {
        setAvailability({ 
          available: true, 
          mode: 'daily', 
          remaining: stock.remaining_quantity 
        });
      }

      setIsLoading(false);
    };

    if (menuItemId && canteenId) {
      checkAvailability();
    }
  }, [menuItemId, canteenId]);

  return { availability, isLoading };
}

// Hook to get all item availability for a canteen at once
export function useCanteenStockInfo(canteenId: string) {
  const [stockMode, setStockMode] = useState<'simple' | 'daily'>('simple');
  const [stockMap, setStockMap] = useState<Record<string, { remaining: number; status: string }>>({});
  const [menuItemsMap, setMenuItemsMap] = useState<Record<string, { stock_quantity: number; is_available: boolean }>>({});
  const [hasStockForToday, setHasStockForToday] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStockInfo = async () => {
      if (!canteenId) return;
      
      setIsLoading(true);
      
      // Get canteen stock mode
      const { data: canteen } = await supabase
        .from('canteens')
        .select('stock_mode')
        .eq('id', canteenId)
        .maybeSingle();

      const mode = (canteen?.stock_mode as 'simple' | 'daily') || 'simple';
      setStockMode(mode);

      // Always fetch menu_items stock for live inventory
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('id, stock_quantity, is_available')
        .eq('canteen_id', canteenId);

      if (menuItems) {
        const mMap: Record<string, { stock_quantity: number; is_available: boolean }> = {};
        menuItems.forEach(mi => {
          mMap[mi.id] = {
            stock_quantity: mi.stock_quantity ?? 0,
            is_available: mi.is_available ?? true,
          };
        });
        setMenuItemsMap(mMap);
      }

      // For daily mode, get today's stock for all items
      const today = new Date().toISOString().split('T')[0];
      const { data: stocks } = await supabase
        .from('daily_stock')
        .select('menu_item_id, remaining_quantity, status')
        .eq('canteen_id', canteenId)
        .eq('date', today);

      if (stocks && stocks.length > 0) {
        setHasStockForToday(true);
        const map: Record<string, { remaining: number; status: string }> = {};
        stocks.forEach(s => {
          map[s.menu_item_id] = { 
            remaining: s.remaining_quantity, 
            status: s.status 
          };
        });
        setStockMap(map);
      } else {
        setHasStockForToday(false);
      }

      setIsLoading(false);
    };

    fetchStockInfo();

    // Subscribe to realtime updates on daily_stock
    const today = new Date().toISOString().split('T')[0];
    const channel = supabase
      .channel(`daily-stock-${canteenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_stock',
          filter: `canteen_id=eq.${canteenId}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (record && record.date === today) {
            setStockMap(prev => ({
              ...prev,
              [record.menu_item_id]: {
                remaining: record.remaining_quantity,
                status: record.status
              }
            }));
          }
        }
      )
      .subscribe();

    // Subscribe to realtime updates on menu_items stock
    const menuChannel = supabase
      .channel(`canteen-menu-items-${canteenId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
          filter: `canteen_id=eq.${canteenId}`,
        },
        (payload) => {
          const record = payload.new as any;
          if (record && record.id) {
            setMenuItemsMap(prev => ({
              ...prev,
              [record.id]: {
                stock_quantity: record.stock_quantity ?? 0,
                is_available: record.is_available ?? true,
              }
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(menuChannel);
    };
  }, [canteenId]);

  const getItemStock = (itemId: string) => {
    const itemData = menuItemsMap[itemId];
    const isAvail = itemData ? itemData.is_available : true;
    const stockQty = itemData ? itemData.stock_quantity : undefined;

    if (stockMode === 'simple') {
      if (itemData && (!isAvail || (stockQty !== undefined && stockQty <= 0))) {
        return { available: false, mode: 'simple' as const, remaining: 0, reason: 'Sold out' };
      }
      return { available: true, mode: 'simple' as const, remaining: stockQty };
    }
    
    // In daily mode:
    const stock = stockMap[itemId];
    if (stock) {
      if (stock.status === 'unavailable' || stock.remaining === 0) {
        return { available: false, mode: 'daily' as const, remaining: 0, reason: 'Sold out' };
      }
      return { available: true, mode: 'daily' as const, remaining: stock.remaining };
    }

    // Fallback to live menu_item stock
    if (itemData) {
      if (!isAvail || (stockQty !== undefined && stockQty <= 0)) {
        return { available: false, mode: 'daily' as const, remaining: 0, reason: 'Sold out' };
      }
      return { available: true, mode: 'daily' as const, remaining: stockQty };
    }
    
    if (!hasStockForToday) {
      return { available: false, mode: 'daily' as const, reason: 'Stock not set' };
    }
    
    return { available: false, mode: 'daily' as const, reason: 'Not in stock' };
  };

  return { stockMode, hasStockForToday, getItemStock, isLoading };
}
