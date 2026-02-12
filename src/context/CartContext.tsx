import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CartItem, MenuItem, SizeVariant } from '@/lib/types';
import { toast } from 'sonner';

const CART_STORAGE_KEY = 'preorder_carts';

interface CanteenCart {
  items: CartItem[];
  canteenName: string;
}

interface CartContextType {
  carts: Record<string, CanteenCart>;
  addToCart: (item: MenuItem, canteenId: string, canteenName: string, size?: SizeVariant, priceOverride?: number) => void;
  removeFromCart: (canteenId: string, itemId: string, size?: SizeVariant) => void;
  updateQuantity: (canteenId: string, itemId: string, quantity: number, size?: SizeVariant) => void;
  clearCart: (canteenId: string) => void;
  clearAllCarts: () => void;
  getTotal: (canteenId: string) => number;
  getItemCount: (canteenId: string) => number;
  getTotalItemCount: () => number;
  getCanteenItems: (canteenId: string) => CartItem[];
  getCanteenName: (canteenId: string) => string | null;
  getActiveCanteenIds: () => string[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const loadCartsFromStorage = (): Record<string, CanteenCart> => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

// Helper to create unique key for item (with or without size)
const getItemKey = (itemId: string, size?: SizeVariant) => {
  return size ? `${itemId}-${size}` : itemId;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Record<string, CanteenCart>>(loadCartsFromStorage);

  // Persist carts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(carts));
  }, [carts]);

  const addToCart = useCallback((item: MenuItem, canteenId: string, canteenName: string, size?: SizeVariant, priceOverride?: number) => {
    setCarts(prev => {
      const canteenCart = prev[canteenId] || { items: [], canteenName };
      const existing = canteenCart.items.find(i => 
        i.menuItem.id === item.id && i.size === size
      );
      
      let newItems: CartItem[];
      if (existing) {
        newItems = canteenCart.items.map(i => 
          (i.menuItem.id === item.id && i.size === size)
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      } else {
        newItems = [...canteenCart.items, { 
          menuItem: item, 
          quantity: 1, 
          size, 
          priceOverride 
        }];
      }
      
      return {
        ...prev,
        [canteenId]: { items: newItems, canteenName }
      };
    });
    
    const sizeLabel = size ? ` (${size.charAt(0).toUpperCase() + size.slice(1)})` : '';
    toast.success(`Added ${item.name}${sizeLabel} to cart`);
  }, []);

  const removeFromCart = useCallback((canteenId: string, itemId: string, size?: SizeVariant) => {
    setCarts(prev => {
      const canteenCart = prev[canteenId];
      if (!canteenCart) return prev;
      
      const newItems = canteenCart.items.filter(i => 
        !(i.menuItem.id === itemId && i.size === size)
      );
      
      if (newItems.length === 0) {
        const { [canteenId]: _, ...rest } = prev;
        return rest;
      }
      
      return {
        ...prev,
        [canteenId]: { ...canteenCart, items: newItems }
      };
    });
    toast.success('Item removed from cart');
  }, []);

  const updateQuantity = useCallback((canteenId: string, itemId: string, quantity: number, size?: SizeVariant) => {
    if (quantity <= 0) {
      removeFromCart(canteenId, itemId, size);
      return;
    }
    
    setCarts(prev => {
      const canteenCart = prev[canteenId];
      if (!canteenCart) return prev;
      
      return {
        ...prev,
        [canteenId]: {
          ...canteenCart,
          items: canteenCart.items.map(i => 
            (i.menuItem.id === itemId && i.size === size)
              ? { ...i, quantity }
              : i
          )
        }
      };
    });
  }, [removeFromCart]);

  const clearCart = useCallback((canteenId: string) => {
    setCarts(prev => {
      const { [canteenId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllCarts = useCallback(() => {
    setCarts({});
  }, []);

  const getTotal = useCallback((canteenId: string) => {
    const canteenCart = carts[canteenId];
    if (!canteenCart) return 0;
    return canteenCart.items.reduce((sum, item) => {
      const price = item.priceOverride ?? item.menuItem.price;
      return sum + (price * item.quantity);
    }, 0);
  }, [carts]);

  const getItemCount = useCallback((canteenId: string) => {
    const canteenCart = carts[canteenId];
    if (!canteenCart) return 0;
    return canteenCart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [carts]);

  const getTotalItemCount = useCallback(() => {
    return Object.values(carts).reduce((total, cart) => 
      total + cart.items.reduce((sum, item) => sum + item.quantity, 0), 0
    );
  }, [carts]);

  const getCanteenItems = useCallback((canteenId: string) => {
    return carts[canteenId]?.items || [];
  }, [carts]);

  const getCanteenName = useCallback((canteenId: string) => {
    return carts[canteenId]?.canteenName || null;
  }, [carts]);

  const getActiveCanteenIds = useCallback(() => {
    return Object.keys(carts).filter(id => carts[id].items.length > 0);
  }, [carts]);

  return (
    <CartContext.Provider value={{
      carts,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      clearAllCarts,
      getTotal,
      getItemCount,
      getTotalItemCount,
      getCanteenItems,
      getCanteenName,
      getActiveCanteenIds,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
