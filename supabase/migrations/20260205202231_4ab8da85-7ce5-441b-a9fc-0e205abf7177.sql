-- Fix the trigger function to properly use gen_random_bytes with correct schema reference
DROP FUNCTION IF EXISTS public.set_qr_token_on_payment() CASCADE;

CREATE OR REPLACE FUNCTION public.set_qr_token_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- Generate QR token when payment becomes paid and qr_token is null
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') AND NEW.qr_token IS NULL THEN
    NEW.qr_token := encode(extensions.gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate triggers for orders table
CREATE TRIGGER trigger_set_qr_token_orders
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token_on_payment();

-- Recreate triggers for shop_orders table  
CREATE TRIGGER trigger_set_qr_token_shop_orders
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token_on_payment();

-- Update the pending orders that should have been marked as paid
UPDATE orders 
SET payment_status = 'paid', 
    qr_token = encode(extensions.gen_random_bytes(32), 'hex')
WHERE id IN ('1592c1ef-f3df-42fc-a773-6ffd35b267a1', '383ca4cd-0645-495d-9bb9-a4babe5097e1');