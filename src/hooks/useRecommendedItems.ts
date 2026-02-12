import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RecommendedItem {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  canteen_id: string;
  canteen_name: string;
  score: number;
}

export function useRecommendedItems(userId: string | undefined) {
  const [items, setItems] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchRecommendations = async () => {
      setIsLoading(true);

      try {
        // Step 1: Get student's order item quantities
        const { data: studentOrders } = await supabase
          .from('order_items')
          .select('menu_item_id, quantity, orders!inner(user_id, payment_status)')
          .eq('orders.user_id', userId)
          .eq('orders.payment_status', 'paid');

        const studentQuantities: Record<string, number> = {};
        if (studentOrders) {
          for (const item of studentOrders) {
            const id = item.menu_item_id;
            studentQuantities[id] = (studentQuantities[id] || 0) + item.quantity;
          }
        }

        // Step 2: Get overall popularity (all users)
        const { data: allOrders } = await supabase
          .from('order_items')
          .select('menu_item_id, quantity, orders!inner(payment_status)')
          .eq('orders.payment_status', 'paid');

        const totalQuantities: Record<string, number> = {};
        if (allOrders) {
          for (const item of allOrders) {
            const id = item.menu_item_id;
            totalQuantities[id] = (totalQuantities[id] || 0) + item.quantity;
          }
        }

        // Collect all unique menu item IDs
        const allItemIds = new Set([
          ...Object.keys(studentQuantities),
          ...Object.keys(totalQuantities),
        ]);

        if (allItemIds.size === 0) {
          setItems([]);
          setIsLoading(false);
          return;
        }

        // Fetch available menu items with canteen info
        const { data: menuItems } = await supabase
          .from('menu_items')
          .select('id, name, price, image_url, canteen_id, is_available, canteens!inner(name, approval_status)')
          .eq('is_available', true)
          .eq('canteens.approval_status', 'approved')
          .in('id', Array.from(allItemIds));

        if (!menuItems || menuItems.length === 0) {
          // Fallback: show top popular available items even if not in order history
          const { data: fallbackItems } = await supabase
            .from('menu_items')
            .select('id, name, price, image_url, canteen_id, is_available, canteens!inner(name, approval_status)')
            .eq('is_available', true)
            .eq('canteens.approval_status', 'approved')
            .limit(3);

          if (fallbackItems) {
            setItems(
              fallbackItems.map((item) => ({
                id: item.id,
                name: item.name,
                price: item.price,
                image_url: item.image_url,
                canteen_id: item.canteen_id,
                canteen_name: (item.canteens as any)?.name || 'Unknown',
                score: 0,
              }))
            );
          }
          setIsLoading(false);
          return;
        }

        // Step 3 & 4: Calculate scores and sort
        const scored: RecommendedItem[] = menuItems.map((item) => {
          const studentQty = studentQuantities[item.id] || 0;
          const totalQty = totalQuantities[item.id] || 0;
          const score = studentQty * 2 + totalQty;

          return {
            id: item.id,
            name: item.name,
            price: item.price,
            image_url: item.image_url,
            canteen_id: item.canteen_id,
            canteen_name: (item.canteens as any)?.name || 'Unknown',
            score,
          };
        });

        scored.sort((a, b) => b.score - a.score);

        // Step 5: Top 3
        setItems(scored.slice(0, 3));
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [userId]);

  return { items, isLoading };
}
