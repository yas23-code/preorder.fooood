-- Add policy for super admins to view all orders
CREATE POLICY "Super admins can view all orders"
ON public.orders
FOR SELECT
USING (has_super_admin_role(auth.uid()));

-- Add policy for super admins to view all order items
CREATE POLICY "Super admins can view all order items"
ON public.order_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.id = order_items.order_id
  AND has_super_admin_role(auth.uid())
));