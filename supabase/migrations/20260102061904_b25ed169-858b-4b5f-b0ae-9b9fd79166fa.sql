-- Add minimum_amount column to coupons table
ALTER TABLE public.coupons 
ADD COLUMN minimum_amount numeric DEFAULT 0;