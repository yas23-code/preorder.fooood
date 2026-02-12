import { useState, useMemo, useEffect } from 'react';
import { useRandomPlaceholder } from '@/hooks/useRandomPlaceholder';
import { useCanteenOrderStatus } from '@/hooks/useCanteenOrderStatus';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AnimatedSearchInput } from '@/components/AnimatedSearchInput';
import { EmptyState } from '@/components/EmptyState';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, UtensilsCrossed, ShoppingCart, Star, Plus, Check, AlertTriangle } from 'lucide-react';
import { OrderCapacityBadge } from '@/components/OrderCapacityBadge';
import { toast } from 'sonner';
import { ShakeSizeSelector, isShakeItem, getShakePrice, SIZE_OPTIONS } from '@/components/ShakeSizeSelector';
import { SizeVariant } from '@/lib/types';

interface Canteen {
  id: string;
  name: string;
  location: string;
  image_url: string | null;
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

export default function CategoryItems() {
  const { canteenId, categoryName } = useParams<{ canteenId: string; categoryName: string }>();
  const navigate = useNavigate();
  const { addToCart, getItemCount, getCanteenItems } = useCart();
  const itemCount = canteenId ? getItemCount(canteenId) : 0;
  const cartItems = canteenId ? getCanteenItems(canteenId) : [];
  
  // Real-time order limit status
  const { canAcceptOrders, activeOrderCount, isAtLimit, orderLimit, isLoading: orderStatusLoading } = useCanteenOrderStatus(canteenId);

  const [searchQuery, setSearchQuery] = useState('');
  const searchPlaceholder = useRandomPlaceholder();
  const [canteen, setCanteen] = useState<Canteen | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [selectedSizes, setSelectedSizes] = useState<Record<string, SizeVariant>>({});
  const decodedCategory = categoryName ? decodeURIComponent(categoryName) : '';

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
      let query = supabase
        .from('menu_items')
        .select('*')
        .eq('canteen_id', canteenId)
        .order('name');
      
      // Filter by category if not "all"
      if (decodedCategory !== 'all') {
        query = query.eq('category', decodedCategory);
      }

      const { data: itemsData } = await query;
      setMenuItems(itemsData || []);
      setIsLoading(false);
    };

    fetchData();
  }, [canteenId, decodedCategory]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return menuItems;
    const query = searchQuery.toLowerCase();
    return menuItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      (item.description?.toLowerCase().includes(query))
    );
  }, [menuItems, searchQuery]);

  const handleAddToCart = (item: MenuItem) => {
    if (!canAcceptOrders) {
      toast.error('This vendor is not accepting new orders right now');
      return;
    }
    
    if (!item.is_available) {
      toast.error('This item is currently unavailable');
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
      <div className="min-h-screen bg-mcd-cream">
        <div className="border-b border-mcd-border bg-mcd-cream">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground hover:text-mcd-red transition-colors">
              <ArrowLeft className="h-4 w-4 text-mcd-red" />
              <span>Back</span>
            </button>
            <div className="flex-1 text-center">
              <div className="h-6 w-32 bg-mcd-selected rounded animate-pulse mx-auto" />
            </div>
            <div className="w-20" />
          </div>
        </div>
        <main className="max-w-7xl mx-auto px-4 py-12 flex justify-center">
          <LoadingSpinner text="Loading items..." />
        </main>
      </div>
    );
  }

  if (!canteen) {
    return (
      <div className="min-h-screen bg-mcd-cream">
        <div className="border-b border-mcd-border bg-mcd-cream">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center">
            <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-foreground hover:text-mcd-red transition-colors">
              <ArrowLeft className="h-4 w-4 text-mcd-red" />
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
    <div className="min-h-screen bg-mcd-cream">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-mcd-border bg-mcd-cream shadow-card">
        <div className="max-w-7xl mx-auto px-4 h-[72px] md:h-24 flex items-center">
          <button 
            onClick={() => navigate(`/student/canteen/${canteenId}`)} 
            className="flex items-center gap-1 md:gap-2 text-foreground hover:text-mcd-red transition-colors text-sm md:text-base font-medium"
          >
            <ArrowLeft className="h-4 w-4 text-mcd-red" />
            <span className="hidden sm:inline">Back</span>
          </button>
          
          <div className="flex-1 text-center px-2">
            <h1 className="text-base md:text-xl font-bold font-display truncate">{canteen.name}</h1>
            <p className="text-xs md:text-sm text-muted-foreground truncate">
              {decodedCategory === 'all' ? 'All Items' : decodedCategory}
            </p>
          </div>
          
          <Link to="/student/cart" className="relative">
            <Button variant="outline" size="icon" className="h-9 w-9 md:h-10 md:w-10 bg-mcd-selected border-mcd-border hover:bg-mcd-yellow">
              <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-mcd-red" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 md:h-5 md:w-5 bg-mcd-red text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-3 md:px-4 py-4 md:py-6">
        {/* Capacity Badge */}
        <div className="flex justify-end mb-4">
          <OrderCapacityBadge 
            activeOrderCount={activeOrderCount} 
            orderLimit={orderLimit} 
            isLoading={orderStatusLoading}
          />
        </div>

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

        {/* Search Bar */}
        <div className="flex gap-2 md:gap-3 mb-4 md:mb-6">
          <div className="flex-1">
            <AnimatedSearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-white border-mcd-border rounded-full pl-4 pr-4 py-5 md:py-6 text-sm md:text-base"
            />
          </div>
          <Button 
            className="bg-mcd-yellow hover:bg-yellow-400 text-foreground font-semibold px-4 md:px-6 rounded-full text-sm md:text-base"
          >
            Search
          </Button>
        </div>

        {/* Menu Items */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredItems.map((item, index) => {
              const isAdded = addedItems.has(item.id);
              const quantityInCart = getItemQuantityInCart(item.id);

              return (
                <div
                  key={item.id}
                  className={`bg-white border-2 border-mcd-border rounded-2xl p-2 shadow-card animate-fade-up ${!item.is_available ? 'opacity-60' : ''}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Image */}
                  <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-mcd-yellow to-yellow-400 flex items-center justify-center">
                        <span className="text-6xl">🍽️</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="pt-3 px-1">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-base font-bold text-foreground line-clamp-1 flex-1 pr-2">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="h-3.5 w-3.5 text-mcd-yellow" fill="#FFC300" />
                        <span className="text-xs font-medium">4.6</span>
                      </div>
                    </div>
                    
                    {/* Size selector for shakes/juices */}
                    {isShakeItem(item.category) && item.is_available && (
                      <ShakeSizeSelector
                        selectedSize={selectedSizes[item.id] || 'medium'}
                        onSizeChange={(size) => handleSizeChange(item.id, size)}
                        compact
                      />
                    )}
                    
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-mcd-border/50">
                      <p className="text-lg font-bold text-mcd-red">
                        ₹{getDisplayPrice(item).toFixed(0)}
                      </p>
                      
                      <Button
                        onClick={() => handleAddToCart(item)}
                        disabled={!item.is_available || isAdded || !canAcceptOrders}
                        size="sm"
                        className={`flex items-center gap-1.5 rounded-full px-4 h-9 font-semibold text-sm ${
                          isAdded 
                            ? 'bg-green-500 hover:bg-green-600 text-white' 
                            : !canAcceptOrders
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-mcd-yellow hover:bg-yellow-400 text-foreground'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Added
                          </>
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
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={UtensilsCrossed}
            title={searchQuery ? "No items found" : "No items in this category"}
            description={searchQuery ? "Try adjusting your search" : "Check back later for new items"}
          />
        )}
      </main>
    </div>
  );
}
