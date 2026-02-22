-- Add customer_phone column to orders table to store phone from payment
ALTER TABLE public.orders ADD COLUMN customer_phone text;

-- Add comment for clarity
COMMENT ON COLUMN public.orders.customer_phone IS 'Phone number used during Cashfree payment';