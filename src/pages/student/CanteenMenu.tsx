import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useRandomPlaceholder } from '@/hooks/useRandomPlaceholder';
import { useCanteenOrderStatus } from '@/hooks/useCanteenOrderStatus';
import { useActiveOrderTimer } from '@/hooks/useActiveOrderTimer';
import { useCanteenStockInfo } from '@/hooks/useItemAvailability';
import { Button } from '@/components/ui/button';
import { AnimatedSearchInput } from '@/components/AnimatedSearchInput';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UtensilsCrossed, ShoppingCart, Star, Plus, Check, Clock, AlertTriangle, Package } from 'lucide-react';
import { OrderCapacityBadge } from '@/components/OrderCapacityBadge';
import { toast } from 'sonner';
import { useReadyOrderNotifications } from '@/hooks/useReadyOrderNotifications';
import { SwipeableNotification } from '@/components/SwipeableNotification';
import { ShakeSizeSelector, isShakeItem, getShakePrice } from '@/components/ShakeSizeSelector';
import { SizeVariant } from '@/lib/types';
import { ActiveOrderBottomBar } from '@/components/ActiveOrderBottomBar';

interface Canteen {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
  is_open: boolean;
}

interface MenuItem {
  id: string;
  canteen_id: string;
  category: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  image_url: string | null;
}

export default function CanteenMenu() {
  const { canteenId } = useParams<{ canteenId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { getItemCount, addToCart, getCanteenItems } = useCart();
  const itemCount = canteenId ? getItemCount(canteenId) : 0;
  const cartItems = canteenId ? getCanteenItems(canteenId) : [];
  
  // Active order timer with real-time subscription
  const { 
    activeOrder, 
    orderStatus,
    estimatedReadyTime,
    setActiveOrder, 
    clearActiveOrder 
  } = useActiveOrderTimer(canteenId);
  
  // Check for countdown data from payment success navigation
  useEffect(() => {
    const state = location.state as { 
      showCountdown?: boolean; 
      pickupCode?: string; 
      estimatedReadyTime?: string;
      orderId?: string;
    } | null;
    
    if (state?.showCountdown && state?.pickupCode && state?.orderId && canteenId) {
      setActiveOrder({
        orderId: state.orderId,
        canteenId: canteenId,
        pickupCode: state.pickupCode,
        estimatedReadyTime: state.estimatedReadyTime || null, // May be null until vendor accepts
      });
      // Clear the state to prevent showing on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state, canteenId, setActiveOrder]);
  
  // Real-time order limit status
  const { canAcceptOrders, activeOrderCount, orderLimit, isAtLimit, isLoading: orderStatusLoading } = useCanteenOrderStatus(canteenId);

  // Stock info for daily stock mode
  const { stockMode, hasStockForToday, getItemStock, isLoading: stockLoading } = useCanteenStockInfo(canteenId || '');

  // Get current user for notifications
  const [userId, setUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data?.user?.id);
    });
  }, []);

  const { visibleReadyOrders, dismissNotification } = useReadyOrderNotifications(userId);

  const [searchQuery, setSearchQuery] = useState('');
  const searchPlaceholder = useRandomPlaceholder();
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Record<string, SizeVariant>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!canteenId) return;

      // Fetch canteen
      const { data: canteenData } = await supabase
        .from('canteens')
        .select('*')
        .eq('id', canteenId)
        .maybeSingle();
      
      setCanteen(canteenData);

      // Fetch menu items
      const { data: itemsData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('canteen_id', canteenId)
        .order('category')
        .order('name');
      
      setMenuItems(itemsData || []);

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('canteen_id', canteenId);
      
      setCategories(categoriesData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [canteenId]);

  // Get unique categories from menu items if no categories defined
  const displayCategories = useMemo(() => {
    // Always include "All" category first
    const allCategory: Category = { id: 'all', name: 'All', image_url: canteen?.image_url || null };
    
    let categoryList: Category[] = [];
    
    if (categories.length > 0) {
      categoryList = categories;
    } else {
      // Get unique categories from menu items
      const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
      categoryList = uniqueCategories.map(name => ({ id: name, name, image_url: null }));
    }
    
    return [allCategory, ...categoryList];
  }, [categories, menuItems, canteen]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery) return displayCategories;
    const query = searchQuery.toLowerCase();
    return displayCategories.filter(cat => 
      cat.name.toLowerCase().includes(query)
    );
  }, [displayCategories, searchQuery]);

  // Filter menu items based on selected category and search
  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    // Filter by category if not "all"
    if (selectedCategory !== 'all') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase().includes(query))
      );
    }
    
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  const handleCategoryClick = (category: Category) => {
    if (category.id === 'all') {
      // Show all items on same page
      setSelectedCategory('all');
    } else {
      // Navigate to category page
      navigate(`/student/canteen/${canteenId}/category/${encodeURIComponent(category.name)}`);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    if (!canAcceptOrders) {
      toast.error('This vendor is not accepting new orders right now');
      return;
    }
    
    if (!item.is_available) {
      toast.error('This item is currently unavailable');
      return;
    }

    // Check stock availability in daily mode
    const itemStock = getItemStock(item.id);
    if (!itemStock.available) {
      toast.error(itemStock.reason || 'This item is sold out');
      return;
    }

    const isShake = isShakeItem(item.category);
    if (isShake) {
      const size = selectedSizes[item.id] || 'medium';
      const price = getShakePrice(size);
      addToCart(item, canteenId!, canteen?.name || '', size, price);
    } else {
      addToCart(item, canteenId!, canteen?.name || '');
    }
    
    setAddedItems(prev => new Set(prev).add(item.id));

    // Reset the added state after animation
    setTimeout(() => {
      setAddedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 1500);
  };

  const handleSizeChange = (itemId: string, size: SizeVariant) => {
    setSelectedSizes(prev => ({ ...prev, [itemId]: size }));
  };

  const getDisplayPrice = (item: MenuItem) => {
    if (isShakeItem(item.category)) {
      const size = selectedSizes[item.id] || 'medium';
      return getShakePrice(size);
    }
    return item.price;
  };

  const getItemQuantityInCart = (itemId: string) => {
    // For shakes, count all sizes of this item
    const matchingItems = cartItems.filter(item => item.menuItem.id === itemId);
    return matchingItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate('/student/dashboard')} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
            <div className="flex-1 text-center">
              <div className="h-6 w-32 bg-amber-200 rounded animate-pulse mx-auto" />
            </div>
            <div className="w-20" />
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
          <LoadingSpinner text="Loading menu..." />
        </main>
      </div>
    );
  }

  // Check if canteen is closed
  if (!canteen.is_open) {
    return (
      <div className="min-h-screen bg-amber-50">
        <header className="sticky top-0 z-50 border-b border-amber-200 bg-amber-50">
          <div className="max-w-7xl mx-auto px-3 md:px-4 py-3 md:py-4 flex items-center">
            <button 
              onClick={() => navigate('/student/dashboard')} 
              className="flex items-center gap-1 md:gap-2 text-foreground hover:text-primary transition-colors text-sm md:text-base"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            
            <div className="flex-1 text-center px-2">
              <h1 className="text-base md:text-xl font-bold font-display truncate">{canteen.name}</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">{canteen.location}</p>
            </div>
            
            <div className="w-9 md:w-10" />
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mb-6">
              <Clock className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Canteen is Closed</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              Sorry, {canteen.name} is currently not accepting orders. Please check back later or explore other canteens.
            </p>
            <Button asChild variant="gradient">
              <Link to="/student/dashboard">Browse Other Canteens</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }
  if (!canteen) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="border-b border-amber-200 bg-amber-50">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate('/student/dashboard')} className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 py-8">
          <EmptyState
            icon={UtensilsCrossed}
            title="Canteen not found"
            description="The canteen you're looking for doesn't exist"
            action={
              <Button asChild variant="gradient">
                <Link to="/student/dashboard">Back to Dashboard</Link>
              </Button>
            }
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mcd-cream w-full max-w-full overflow-x-hidden">
      {/* Ready Order Notifications */}
      {visibleReadyOrders.length > 0 && (
        <div className="fixed top-4 left-4 right-4 z-[100] flex flex-col gap-2">
          {visibleReadyOrders.map((order) => (
            <SwipeableNotification
              key={order.id}
              orderId={order.id}
              pickupCode={order.pickup_code}
              canteenName={order.canteen_name}
              onDismiss={dismissNotification}
            />
          ))}
        </div>
      )}

      {/* Header - McDonald's Theme */}
      <header className="sticky top-0 z-50 border-b border-mcd-border bg-mcd-cream shadow-card w-full">
        <div className="px-4 h-[72px] md:h-24 flex items-center justify-between">
          <button 
            onClick={() => navigate('/student/dashboard')} 
            className="flex items-center gap-1.5 text-foreground hover:text-mcd-red transition-colors text-sm font-medium"
          >
            <ArrowLeft className="h-4 w-4 text-mcd-red" />
            <span>Back</span>
          </button>
          
          {/* Canteen name - centered */}
          <div className="flex-1 text-center px-2">
            <h1 className="text-lg md:text-xl font-bold font-display leading-tight">{canteen.name}</h1>
            <p className="text-xs text-muted-foreground leading-tight">{canteen.location}</p>
          </div>
          
          <Link to={`/student/cart/${canteenId}`} className="relative flex-shrink-0">
            <Button variant="outline" size="icon" className="h-10 w-10 bg-mcd-selected border-mcd-border hover:bg-mcd-yellow">
              <ShoppingCart className="h-5 w-5 text-mcd-red" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-mcd-red text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="px-4 py-4 w-full">
        {/* Order Status Warning Banner */}
        {!canAcceptOrders && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800">
                {isAtLimit ? 'Order limit reached' : 'Not accepting orders'}
              </p>
              <p className="text-sm text-amber-700">
                {isAtLimit 
                  ? `This vendor has reached their maximum of ${orderLimit} active orders. Please check back later.`
                  : 'This vendor is currently not accepting new orders. Please check back later.'
                }
              </p>
            </div>
          </div>
        )}

        {/* Title & Capacity */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">What are you craving?</h2>
          <OrderCapacityBadge 
            activeOrderCount={activeOrderCount} 
            orderLimit={orderLimit} 
            isLoading={orderStatusLoading}
          />
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1">
            <AnimatedSearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-white border-mcd-border rounded-full pl-4 pr-4 h-11 text-sm"
            />
          </div>
          <Button 
            className="bg-mcd-yellow hover:bg-yellow-400 text-foreground font-semibold px-5 rounded-full text-sm h-11"
          >
            Search
          </Button>
        </div>

        {/* Categories - Grid with 3 columns */}
        {filteredCategories.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {filteredCategories.map((category, index) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-20 h-20 rounded-full overflow-hidden border-3 transition-colors shadow-card ${
                  (selectedCategory === 'all' && category.id === 'all') || selectedCategory === category.id
                    ? 'border-mcd-yellow bg-mcd-selected' 
                    : 'border-mcd-border group-hover:border-mcd-yellow'
                }`}>
                  {category.image_url ? (
                    <img 
                      src={category.image_url} 
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-mcd-yellow to-yellow-400 flex items-center justify-center">
                      <span className="text-2xl">🍽️</span>
                    </div>
                  )}
                </div>
                <span className={`text-xs font-medium text-center transition-colors line-clamp-2 ${
                  (selectedCategory === 'all' && category.id === 'all') || selectedCategory === category.id
                    ? 'text-mcd-red font-semibold'
                    : 'text-foreground group-hover:text-mcd-red'
                }`}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* All Items Section - shown when "All" is selected */}
        {selectedCategory === 'all' && (
          <>
            {filteredItems.length > 0 ? (
              <div className="space-y-3">
                {filteredItems.map((item, index) => {
                  const isAdded = addedItems.has(item.id);
                  const quantityInCart = getItemQuantityInCart(item.id);
                  const itemStock = getItemStock(item.id);
                  const isItemAvailable = item.is_available && itemStock.available;
                  const isSoldOut = !itemStock.available && itemStock.mode === 'daily';

                  return (
                    <div
                      key={item.id}
                      className={`bg-white border border-mcd-border rounded-2xl overflow-hidden shadow-card ${!isItemAvailable ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-center p-3 gap-3">
                        {/* Image */}
                        <div className="relative w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-mcd-yellow to-yellow-400 flex items-center justify-center">
                              <span className="text-3xl">🍽️</span>
                            </div>
                          )}
                          {isSoldOut && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                              <span className="text-white font-bold text-sm">SOLD OUT</span>
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 py-1">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="text-base font-bold text-foreground leading-tight line-clamp-1 flex-1 pr-2">
                              {item.name}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {itemStock.mode === 'daily' && itemStock.available && itemStock.remaining !== undefined && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 bg-accent/10 border-accent/30">
                                  <Package className="h-2.5 w-2.5 mr-0.5" />
                                  {itemStock.remaining}
                                </Badge>
                              )}
                              <div className="flex items-center gap-0.5">
                                <Star className="h-3.5 w-3.5 text-mcd-yellow" fill="#FFC300" />
                                <span className="text-xs font-medium">4.5</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Size selector for shakes/juices */}
                          {isShakeItem(item.category) && isItemAvailable && (
                            <ShakeSizeSelector
                              selectedSize={selectedSizes[item.id] || 'medium'}
                              onSizeChange={(size) => handleSizeChange(item.id, size)}
                              compact
                            />
                          )}
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-mcd-border/50">
                            <p className="text-lg font-bold text-mcd-red">
                              ₹{getDisplayPrice(item).toFixed(0)}
                            </p>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddToCart(item)}
                              disabled={!isItemAvailable || isAdded || !canAcceptOrders}
                              className={`flex items-center gap-1.5 text-sm h-9 px-4 rounded-full font-semibold ${
                                isAdded 
                                  ? 'bg-green-100 border-green-500 text-green-600' 
                                  : !canAcceptOrders || !isItemAvailable
                                  ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                                  : 'bg-mcd-yellow hover:bg-yellow-400 border-mcd-yellow text-foreground'
                              }`}
                            >
                              {isAdded ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  Added
                                </>
                              ) : isSoldOut ? (
                                'Sold Out'
                              ) : !canAcceptOrders ? (
                                'Unavailable'
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5" />
                                  Add
                                  {quantityInCart > 0 && ` (${quantityInCart})`}
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={UtensilsCrossed}
                title={searchQuery ? "No items found" : "No menu items yet"}
                description={searchQuery ? "Try adjusting your search" : "Check back later for new items"}
              />
            )}
          </>
        )}
        
        {/* Active Order Bottom Bar - persists until order is completed */}
        {activeOrder && (
          <ActiveOrderBottomBar
            canteenName={canteen.name}
            estimatedReadyTime={estimatedReadyTime}
            orderId={activeOrder.orderId}
            orderStatus={orderStatus}
            onOrderCompleted={clearActiveOrder}
          />
        )}
      </main>
    </div>
  );
}
