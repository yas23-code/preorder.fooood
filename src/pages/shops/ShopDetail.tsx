import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useShopCart } from '@/context/ShopCartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AnimatedSearchInput } from '@/components/AnimatedSearchInput';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Store, 
  UtensilsCrossed,
  Plus,
  Clock,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Rotating search placeholders
const SEARCH_PLACEHOLDERS = [
  "Chef's kiss awaits 👨‍🍳",
  "Craving something tasty? 🍔",
  "Search your favorites... 🔍",
  "Hungry? Find it here! 🍕",
  "What's on your mind? 🤔",
];

interface Shop {
  id: string;
  shop_name: string;
  owner_name: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  is_open: boolean;
  image_url: string | null;
}

interface ShopMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  prep_time: number | null;
}

export default function ShopDetail() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { addItem, getCartItemCount } = useShopCart();

  const [shop, setShop] = useState<Shop | null>(null);
  const [menuItems, setMenuItems] = useState<ShopMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  // Rotate search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const cartItemCount = shopId ? getCartItemCount(shopId) : 0;

  useEffect(() => {
    async function fetchShopData() {
      if (!shopId) {
        setError('Shop not found');
        setLoading(false);
        return;
      }

      try {
        const { data: shopData, error: shopError } = await supabase
          .from('shops')
          .select('*')
          .eq('id', shopId)
          .single();

        if (shopError) throw shopError;
        if (!shopData) {
          setError('Shop not found');
          setLoading(false);
          return;
        }

        setShop(shopData);

        const { data: menuData, error: menuError } = await supabase
          .from('shop_menu_items')
          .select('*')
          .eq('shop_id', shopId)
          .eq('is_available', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true });

        if (menuError) throw menuError;
        setMenuItems(menuData || []);
      } catch (err: any) {
        console.error('Error fetching shop:', err);
        setError(err.message || 'Failed to load shop');
      } finally {
        setLoading(false);
      }
    }

    fetchShopData();
  }, [shopId]);

  // Get unique categories with "All" at the start
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(menuItems.map(item => item.category))];
    return ['All', ...uniqueCategories];
  }, [menuItems]);

  // Get category image (first item's image in that category)
  const getCategoryImage = (category: string): string | null => {
    if (category === 'All') {
      return shop?.image_url || menuItems[0]?.image_url || null;
    }
    const categoryItem = menuItems.find(item => item.category === category);
    return categoryItem?.image_url || null;
  };

  // Filter items based on selected category and search query
  const filteredItems = useMemo(() => {
    let items = menuItems;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      items = items.filter(item => 
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== 'All') {
      items = items.filter(item => item.category === selectedCategory);
    }
    
    return items;
  }, [menuItems, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/shops')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-lg">Shop Details</h1>
          </div>
        </div>
        <div className="container max-w-4xl mx-auto px-4 py-16">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Store className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Shop Not Found</h2>
            <p className="text-muted-foreground text-center max-w-sm">
              {error || 'The shop you are looking for does not exist.'}
            </p>
            <Button onClick={() => navigate('/shops')}>
              Browse Nearby Shops
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/shops')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-bold text-lg uppercase">{shop.shop_name}</h1>
                <p className="text-xs text-muted-foreground">{shop.address}</p>
              </div>
            </div>
            
            {/* Cart Icon */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(`/shop/${shopId}/cart`)}
              className="relative"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* What are you craving? */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">What are you craving?</h2>
          <Badge 
            variant="outline" 
            className={cn(
              "border",
              shop.is_open 
                ? "bg-green-500/10 border-green-500/30 text-green-600" 
                : "bg-muted border-muted-foreground/30 text-muted-foreground"
            )}
          >
            {shop.is_open ? 'Open' : 'Closed'}
          </Badge>
        </div>

        {/* Search Bar */}
        <div className="flex gap-2 mb-6">
          <div className="flex-1">
            <AnimatedSearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={SEARCH_PLACEHOLDERS[placeholderIndex]}
              className="w-full bg-card border border-border shadow-sm rounded-full pl-4 pr-4 h-11 text-sm"
            />
          </div>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 rounded-full text-sm h-11"
          >
            Search
          </Button>
        </div>

        {menuItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4 bg-card rounded-xl border">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="font-semibold">No Menu Items</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                This shop hasn't added any menu items yet. Check back later!
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Categories Grid - 3 columns circular */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {categories.map((category) => {
                const categoryImage = getCategoryImage(category);
                const isSelected = selectedCategory === category;
                
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className={cn(
                        "w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 transition-all duration-200",
                        isSelected 
                          ? "border-primary ring-2 ring-primary/30 scale-105" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {categoryImage ? (
                        <img
                          src={categoryImage}
                          alt={category}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center">
                          <UtensilsCrossed className="w-8 h-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <span 
                      className={cn(
                        "text-sm font-medium text-center truncate max-w-full",
                        isSelected ? "text-primary" : "text-foreground"
                      )}
                    >
                      {category}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Food Items List */}
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl bg-card border shadow-sm"
                >
                  {/* Item Image */}
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}

                  {/* Item Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-foreground">{item.name}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          <Clock className="h-3 w-3" />
                          {item.prep_time || 10}m
                        </div>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-lg font-bold text-destructive">
                        ₹{item.price}
                      </p>
                      {shop.is_open && (
                        <Button
                          size="sm"
                          onClick={() => {
                            addItem(shop.id, shop.shop_name, {
                              menuItemId: item.id,
                              name: item.name,
                              price: item.price,
                              imageUrl: item.image_url
                            });
                            toast.success(`${item.name} added to cart`);
                          }}
                          className="gap-1 rounded-full px-4"
                        >
                          <Plus className="w-4 h-4" />
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
