-- Add packing_charge column to order_items to snapshot the charge at time of order
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS packing_charge NUMERIC DEFAULT 0;
