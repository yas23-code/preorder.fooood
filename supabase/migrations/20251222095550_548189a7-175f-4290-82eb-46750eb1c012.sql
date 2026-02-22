-- Add payment_status column to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';

-- Add payment_id column to store Cashfree order ID
ALTER TABLE public.orders 
ADD COLUMN payment_id TEXT;

-- Add payment_session_id column to store Cashfree session ID
ALTER TABLE public.orders 
ADD COLUMN payment_session_id TEXT;