-- Add 'accepted' to the order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'accepted' AFTER 'pending';

-- Add comment for clarity
COMMENT ON TYPE public.order_status IS 'Order lifecycle: pending -> accepted -> ready -> completed, or pending -> rejected';