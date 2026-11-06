-- Restrict vendor SELECT policies on public.orders to only paid orders
DROP POLICY IF EXISTS "Vendors can view orders" ON public.orders;
CREATE POLICY "Vendors can view orders" ON public.orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM canteens
    WHERE canteens.id = orders.canteen_id AND canteens.vendor_id = auth.uid()
  ) AND (payment_status = 'paid')
);

DROP POLICY IF EXISTS "Vendor read canteen orders" ON public.orders;
CREATE POLICY "Vendor read canteen orders" ON public.orders
FOR SELECT TO authenticated USING (
  (vendor_id = auth.uid() OR auth.uid() IN (SELECT vendor_id FROM canteens WHERE id = orders.canteen_id))
  AND (payment_status = 'paid')
);

NOTIFY pgrst, 'reload schema';
