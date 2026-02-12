-- Add QR code columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qr_used BOOLEAN NOT NULL DEFAULT false;

-- Add QR code columns to shop_orders table
ALTER TABLE public.shop_orders 
ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS qr_used BOOLEAN NOT NULL DEFAULT false;

-- Create function to generate QR token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- Create trigger function to auto-generate QR token when payment is confirmed
CREATE OR REPLACE FUNCTION public.set_qr_token_on_payment()
RETURNS TRIGGER
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

-- Create trigger for orders table
DROP TRIGGER IF EXISTS trigger_set_qr_token_orders ON public.orders;
CREATE TRIGGER trigger_set_qr_token_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_qr_token_on_payment();

-- Create trigger for shop_orders table
DROP TRIGGER IF EXISTS trigger_set_qr_token_shop_orders ON public.shop_orders;
CREATE TRIGGER trigger_set_qr_token_shop_orders
BEFORE UPDATE ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.set_qr_token_on_payment();

-- Create function to verify and complete order via QR
CREATE OR REPLACE FUNCTION public.verify_qr_and_complete_order(
  p_qr_token TEXT,
  p_vendor_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_canteen canteens%ROWTYPE;
BEGIN
  -- Find order by QR token
  SELECT * INTO v_order FROM orders WHERE qr_token = p_qr_token;
  
  IF v_order IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid QR code');
  END IF;
  
  -- Check if already used
  IF v_order.qr_used THEN
    RETURN json_build_object('success', false, 'error', 'QR code already used');
  END IF;
  
  -- Check payment status
  IF v_order.payment_status != 'paid' THEN
    RETURN json_build_object('success', false, 'error', 'Payment not confirmed');
  END IF;
  
  -- Check order status
  IF v_order.status != 'ready' THEN
    RETURN json_build_object('success', false, 'error', 'Order not ready for pickup. Current status: ' || v_order.status::text);
  END IF;
  
  -- Get canteen and verify vendor
  SELECT * INTO v_canteen FROM canteens WHERE id = v_order.canteen_id;
  
  IF v_canteen.vendor_id != p_vendor_id THEN
    RETURN json_build_object('success', false, 'error', 'This order belongs to a different vendor');
  END IF;
  
  -- All checks passed - complete the order
  UPDATE orders 
  SET status = 'completed', qr_used = true, updated_at = now()
  WHERE id = v_order.id;
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order.id,
    'message', 'Order completed successfully'
  );
END;
$$;

-- Create function to verify and complete shop order via QR
CREATE OR REPLACE FUNCTION public.verify_qr_and_complete_shop_order(
  p_qr_token TEXT,
  p_owner_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order shop_orders%ROWTYPE;
  v_shop shops%ROWTYPE;
BEGIN
  -- Find order by QR token
  SELECT * INTO v_order FROM shop_orders WHERE qr_token = p_qr_token;
  
  IF v_order IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid QR code');
  END IF;
  
  -- Check if already used
  IF v_order.qr_used THEN
    RETURN json_build_object('success', false, 'error', 'QR code already used');
  END IF;
  
  -- Check payment status
  IF v_order.payment_status != 'paid' THEN
    RETURN json_build_object('success', false, 'error', 'Payment not confirmed');
  END IF;
  
  -- Check order status
  IF v_order.status != 'ready' THEN
    RETURN json_build_object('success', false, 'error', 'Order not ready for pickup. Current status: ' || v_order.status);
  END IF;
  
  -- Get shop and verify owner
  SELECT * INTO v_shop FROM shops WHERE id = v_order.shop_id;
  
  IF v_shop.owner_id != p_owner_id THEN
    RETURN json_build_object('success', false, 'error', 'This order belongs to a different vendor');
  END IF;
  
  -- All checks passed - complete the order
  UPDATE shop_orders 
  SET status = 'completed', qr_used = true, updated_at = now()
  WHERE id = v_order.id;
  
  RETURN json_build_object(
    'success', true, 
    'order_id', v_order.id,
    'message', 'Order completed successfully'
  );
END;
$$;