
-- Add platform fee columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pg_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit numeric DEFAULT 0;

-- Add platform fee columns to shop_orders table
ALTER TABLE public.shop_orders 
ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS pg_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_profit numeric DEFAULT 0;
