import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface ShopCartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string | null;
}

interface ShopCart {
  shopId: string;
  shopName: string;
  items: ShopCartItem[];
}

interface ShopCartContextType {
  carts: Record<string, ShopCart>;
  addItem: (shopId: string, shopName: string, item: Omit<ShopCartItem, 'id' | 'quantity'>) => void;
  removeItem: (shopId: string, itemId: string) => void;
  updateQuantity: (shopId: string, itemId: string, quantity: number) => void;
  clearCart: (shopId: string) => void;
  getCartItemCount: (shopId: string) => number;
  getCartTotal: (shopId: string) => number;
  getTotalItemCount: () => number;
}

const ShopCartContext = createContext<ShopCartContextType | undefined>(undefined);

const STORAGE_KEY = 'shop_carts';

export function ShopCartProvider({ children }: { children: React.ReactNode }) {
  const [carts, setCarts] = useState<Record<string, ShopCart>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(carts));
  }, [carts]);

  const addItem = useCallback((
    shopId: string,
    shopName: string,
    item: Omit<ShopCartItem, 'id' | 'quantity'>
  ) => {
    setCarts(prev => {
      const cart = prev[shopId] || { shopId, shopName, items: [] };
      const existingItemIndex = cart.items.findIndex(i => i.menuItemId === item.menuItemId);

      if (existingItemIndex >= 0) {
        // Increment quantity
        const updatedItems = [...cart.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + 1
        };
        return {
          ...prev,
          [shopId]: { ...cart, items: updatedItems }
        };
      } else {
        // Add new item
        const newItem: ShopCartItem = {
          ...item,
          id: `${item.menuItemId}-${Date.now()}`,
          quantity: 1
        };
        return {
          ...prev,
          [shopId]: { ...cart, shopName, items: [...cart.items, newItem] }
        };
      }
    });
  }, []);

  const removeItem = useCallback((shopId: string, itemId: string) => {
    setCarts(prev => {
      const cart = prev[shopId];
      if (!cart) return prev;

      const updatedItems = cart.items.filter(item => item.id !== itemId);
      
      if (updatedItems.length === 0) {
        const { [shopId]: _, ...rest } = prev;
        return rest;
      }

      return {
        ...prev,
        [shopId]: { ...cart, items: updatedItems }
      };
    });
  }, []);

  const updateQuantity = useCallback((shopId: string, itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(shopId, itemId);
      return;
    }

    setCarts(prev => {
      const cart = prev[shopId];
      if (!cart) return prev;

      const updatedItems = cart.items.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );

      return {
        ...prev,
        [shopId]: { ...cart, items: updatedItems }
      };
    });
  }, [removeItem]);

  const clearCart = useCallback((shopId: string) => {
    setCarts(prev => {
      const { [shopId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const getCartItemCount = useCallback((shopId: string) => {
    const cart = carts[shopId];
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [carts]);

  const getCartTotal = useCallback((shopId: string) => {
    const cart = carts[shopId];
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [carts]);

  const getTotalItemCount = useCallback(() => {
    return Object.values(carts).reduce((sum, cart) => 
      sum + cart.items.reduce((s, item) => s + item.quantity, 0), 0
    );
  }, [carts]);

  return (
    <ShopCartContext.Provider value={{
      carts,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      getCartItemCount,
      getCartTotal,
      getTotalItemCount
    }}>
      {children}
    </ShopCartContext.Provider>
  );
}

export function useShopCart() {
  const context = useContext(ShopCartContext);
  if (context === undefined) {
    throw new Error('useShopCart must be used within a ShopCartProvider');
  }
  return context;
}