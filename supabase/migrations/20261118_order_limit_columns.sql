-- Add order capacity limit toggle, auto-pause tracking, and max concurrent orders to canteens
ALTER TABLE public.canteens
  ADD COLUMN IF NOT EXISTS order_limit_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_paused_by_limit BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_concurrent_orders INTEGER;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
