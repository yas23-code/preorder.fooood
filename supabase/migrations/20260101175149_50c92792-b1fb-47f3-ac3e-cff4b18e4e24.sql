-- Add vendor_id to coupons table
ALTER TABLE public.coupons ADD COLUMN vendor_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop existing SELECT policy and recreate it
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

-- Allow anyone to view active coupons (for cart validation)
CREATE POLICY "Anyone can view active coupons" 
ON public.coupons 
FOR SELECT 
USING (is_active = true);

-- Vendors can view their own coupons (including inactive)
CREATE POLICY "Vendors can view their own coupons" 
ON public.coupons 
FOR SELECT 
USING (auth.uid() = vendor_id);

-- Vendors can create coupons
CREATE POLICY "Vendors can create coupons" 
ON public.coupons 
FOR INSERT 
WITH CHECK (auth.uid() = vendor_id);

-- Vendors can update their own coupons
CREATE POLICY "Vendors can update their own coupons" 
ON public.coupons 
FOR UPDATE 
USING (auth.uid() = vendor_id);

-- Vendors can delete their own coupons
CREATE POLICY "Vendors can delete their own coupons" 
ON public.coupons 
FOR DELETE 
USING (auth.uid() = vendor_id);