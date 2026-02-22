import { Plus, Check, Clock, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MenuItem, SizeVariant } from '@/lib/types';
import { useCart } from '@/context/CartContext';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StockInfo {
  available: boolean;
  mode: 'simple' | 'daily';
  remaining?: number;
  reason?: string;
}

interface MenuItemCardProps {
  item: MenuItem;
  canteenId: string;
  canteenName: string;
  stockInfo?: StockInfo;
}

const SIZE_OPTIONS: { size: SizeVariant; label: string; price: number }[] = [
  { size: 'small', label: 'S', price: 30 },
  { size: 'medium', label: 'M', price: 40 },
  { size: 'large', label: 'L', price: 50 },
];

// Check if item is a shake (category contains "shake")
const isShakeItem = (item: MenuItem) => {
  return item.category?.toLowerCase().includes('shake');
};

// Get default prep time based on category
const getDefaultPrepTime = (category?: string): number => {
  if (!category) return 10;
  const cat = category.toLowerCase();
  if (cat.includes('beverage') || cat.includes('drink') || cat.includes('juice') || cat.includes('shake') || cat.includes('tea') || cat.includes('coffee')) return 5;
  if (cat.includes('snack') || cat.includes('fast food') || cat.includes('sandwich') || cat.includes('burger')) return 10;
  if (cat.includes('main') || cat.includes('meal') || cat.includes('rice') || cat.includes('biryani') || cat.includes('thali')) return 20;
  if (cat.includes('dessert') || cat.includes('sweet') || cat.includes('ice cream')) return 7;
  return 10;
};

// Get prep time display
const getPrepTime = (item: MenuItem): number => {
  return item.prep_time || getDefaultPrepTime(item.category);
};

export function MenuItemCard({ item, canteenId, canteenName, stockInfo }: MenuItemCardProps) {
  const { addToCart, getCanteenItems } = useCart();
  
  // Determine if item is available based on stock mode
  const isStockAvailable = !stockInfo || stockInfo.available;
  const isItemAvailable = item.is_available && isStockAvailable;
  const isSoldOut = stockInfo && !stockInfo.available && stockInfo.mode === 'daily';
  const [isAdded, setIsAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState<SizeVariant>('medium');
  
  const items = getCanteenItems(canteenId);
  const isShake = isShakeItem(item);
  
  // For shakes, count items with any size; for regular items, count by item id
  const quantityInCart = isShake 
    ? items.filter(i => i.menuItem.id === item.id).reduce((sum, i) => sum + i.quantity, 0)
    : items.find(i => i.menuItem.id === item.id)?.quantity || 0;

  const handleAddToCart = () => {
    if (!isItemAvailable) return;
    
    if (isShake) {
      const sizeOption = SIZE_OPTIONS.find(s => s.size === selectedSize);
      addToCart(item, canteenId, canteenName, selectedSize, sizeOption?.price);
    } else {
      addToCart(item, canteenId, canteenName);
    }
    
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1500);
  };

  const getDisplayPrice = () => {
    if (isShake) {
      const sizeOption = SIZE_OPTIONS.find(s => s.size === selectedSize);
      return sizeOption?.price || item.price;
    }
    return item.price;
  };

  return (
    <div className={`card-warm overflow-hidden flex flex-col sm:flex-row gap-4 p-4 ${!isItemAvailable ? 'opacity-60' : ''}`}>
      <div className="sm:w-28 sm:h-28 h-40 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-hero flex items-center justify-center">
            <span className="text-3xl">🍽️</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground">{item.name}</h3>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                <Clock className="h-3 w-3" />
                {getPrepTime(item)}m
              </span>
            </div>
            {!item.is_available && (
              <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Unavailable
              </span>
            )}
            {isSoldOut && (
              <Badge variant="destructive" className="text-xs">
                Sold Out
              </Badge>
            )}
            {stockInfo && stockInfo.mode === 'daily' && stockInfo.available && stockInfo.remaining !== undefined && (
              <Badge variant="outline" className="text-xs bg-accent/10 text-accent-foreground border-accent/30">
                <Package className="h-3 w-3 mr-1" />
                {stockInfo.remaining} left
              </Badge>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
          )}
          
          {/* Size selector for shake items */}
          {isShake && item.is_available && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-muted-foreground">Size:</span>
              <div className="flex gap-1">
                {SIZE_OPTIONS.map((option) => (
                  <button
                    key={option.size}
                    onClick={() => setSelectedSize(option.size)}
                    className={cn(
                      "px-2 py-1 text-xs rounded-md border transition-all",
                      selectedSize === option.size
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50"
                    )}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="ml-1 opacity-75">₹{option.price}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <span className="text-lg font-bold text-foreground">₹{getDisplayPrice()}</span>
          
          <div className="flex items-center gap-2">
            {quantityInCart > 0 && (
              <span className="text-sm text-accent font-medium">
                {quantityInCart} in cart
              </span>
            )}
            <Button 
              size="sm" 
              variant={isAdded ? "warm" : "gradient"}
              onClick={handleAddToCart}
              disabled={!isItemAvailable}
              className="min-w-[80px]"
            >
              {isAdded ? (
                <>
                  <Check className="h-4 w-4" />
                  Added
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
