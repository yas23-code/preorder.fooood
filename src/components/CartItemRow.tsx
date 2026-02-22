import { Minus, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CartItem } from '@/lib/types';
import { useCart } from '@/context/CartContext';

interface CartItemRowProps {
  item: CartItem;
  canteenId: string;
}

const getSizeLabel = (size?: string) => {
  if (!size) return '';
  const labels: Record<string, string> = {
    small: 'Small',
    medium: 'Medium',
    large: 'Large'
  };
  return labels[size] || size;
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

const getPrepTime = (category?: string, prepTime?: number | null): number => {
  return prepTime || getDefaultPrepTime(category);
};

export function CartItemRow({ item, canteenId }: CartItemRowProps) {
  const { updateQuantity, removeFromCart } = useCart();
  const { menuItem, quantity, size, priceOverride } = item;
  const displayPrice = priceOverride ?? menuItem.price;
  const prepTime = getPrepTime(menuItem.category, menuItem.prep_time);

  return (
    <div className="flex items-center justify-between py-2 md:py-3 border-b border-border/50 last:border-0 gap-2 md:gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground text-sm md:text-base truncate">
            {menuItem.name}
            {size && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                ({getSizeLabel(size)})
              </span>
            )}
          </h4>
          <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded flex-shrink-0">
            <Clock className="h-3 w-3" />
            {prepTime}m
          </span>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground">₹{displayPrice} × {quantity}</p>
      </div>
      
      <div className="flex items-center gap-1 md:gap-2">
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 md:h-9 md:w-9 rounded-lg border-border"
          onClick={() => updateQuantity(canteenId, menuItem.id, quantity - 1, size)}
        >
          <Minus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <span className="w-6 md:w-8 text-center font-medium text-sm md:text-base">{quantity}</span>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-7 w-7 md:h-9 md:w-9 rounded-lg border-border"
          onClick={() => updateQuantity(canteenId, menuItem.id, quantity + 1, size)}
        >
          <Plus className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 md:h-9 md:w-9 rounded-lg bg-red-500 hover:bg-red-600 text-white hover:text-white ml-0.5 md:ml-1"
          onClick={() => removeFromCart(canteenId, menuItem.id, size)}
        >
          <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
        </Button>
      </div>
    </div>
  );
}
