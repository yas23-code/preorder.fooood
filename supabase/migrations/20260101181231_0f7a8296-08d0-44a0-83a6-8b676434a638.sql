-- Add canteen_id to coupons table
ALTER TABLE public.coupons ADD COLUMN canteen_id uuid REFERENCES public.canteens(id) ON DELETE CASCADE;

-- Drop old vendor-based policies
DROP POLICY IF EXISTS "Vendors can create coupons" ON public.coupons;
DROP POLICY IF EXISTS "Vendors can update their own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Vendors can delete their own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Vendors can view their own coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- Create new canteen-based policies
CREATE POLICY "Vendors can create coupons for their canteen"
ON public.coupons FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()
));

CREATE POLICY "Vendors can update coupons for their canteen"
ON public.coupons FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()
));

CREATE POLICY "Vendors can delete coupons for their canteen"
ON public.coupons FOR DELETE
USING (EXISTS (
  SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()
));

CREATE POLICY "Vendors can view coupons for their canteen"
ON public.coupons FOR SELECT
USING (EXISTS (
  SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()
));

CREATE POLICY "Anyone can view active coupons by canteen"
ON public.coupons FOR SELECT
USING (is_active = true);