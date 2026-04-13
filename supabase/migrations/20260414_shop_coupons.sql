-- Add shop_id to coupons table
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS shop_id uuid REFERENCES public.shops(id);

-- Add discount fields to shop_orders
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id);
ALTER TABLE public.shop_orders ADD COLUMN IF NOT EXISTS discount_amount numeric DEFAULT 0;

-- Update the view or dependencies if any (none obvious)
