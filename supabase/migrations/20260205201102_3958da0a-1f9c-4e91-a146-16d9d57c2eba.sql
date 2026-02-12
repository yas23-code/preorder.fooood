-- Enable pgcrypto extension for gen_random_bytes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop and recreate the function with proper search path
DROP FUNCTION IF EXISTS public.generate_qr_token();

CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Recreate the trigger function
DROP FUNCTION IF EXISTS public.set_qr_token_on_payment() CASCADE;

CREATE OR REPLACE FUNCTION public.set_qr_token_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate QR token when payment becomes paid and qr_token is null
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') AND NEW.qr_token IS NULL THEN
    NEW.qr_token := public.generate_qr_token();
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers for orders table
DROP TRIGGER IF EXISTS trigger_set_qr_token_orders ON orders;
CREATE TRIGGER trigger_set_qr_token_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token_on_payment();

-- Recreate triggers for shop_orders table  
DROP TRIGGER IF EXISTS trigger_set_qr_token_shop_orders ON shop_orders;
CREATE TRIGGER trigger_set_qr_token_shop_orders
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token_on_payment();

-- Generate QR tokens for all existing paid orders that don't have one
UPDATE orders 
SET qr_token = encode(gen_random_bytes(32), 'hex')
WHERE payment_status = 'paid' AND qr_token IS NULL;

UPDATE shop_orders 
SET qr_token = encode(gen_random_bytes(32), 'hex')
WHERE payment_status = 'paid' AND qr_token IS NULL;