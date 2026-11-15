-- 1. Update the paid order 821b37dd-96b4-487d-bce2-751bcf2ae990 from Token 16 to Token 5
UPDATE public.orders
SET token_number = '5',
    pickup_token = '5',
    order_no = 5
WHERE id = '821b37dd-96b4-487d-bce2-751bcf2ae990';

-- 2. Clear token_number on all unpaid/pending/failed test orders so they never interfere with max calculation
UPDATE public.orders
SET token_number = NULL,
    pickup_token = NULL,
    order_no = NULL
WHERE payment_status != 'paid';

-- 3. Update the trigger function to ONLY calculate tokens for PAID orders
CREATE OR REPLACE FUNCTION public.handle_order_token_and_pickup_code()
RETURNS TRIGGER AS $$
DECLARE
  v_cycle_start TIMESTAMPTZ;
  v_next_token INT;
BEGIN
  -- Determine 10:00 PM cycle start in Asia/Kolkata
  IF (now() AT TIME ZONE 'Asia/Kolkata')::time >= '22:00:00'::time THEN
    v_cycle_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '22 hours') AT TIME ZONE 'Asia/Kolkata';
  ELSE
    v_cycle_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - interval '1 day' + interval '22 hours') AT TIME ZONE 'Asia/Kolkata';
  END IF;

  -- Auto-generate secure 4-digit pickup code if not provided (1000 - 9999)
  IF NEW.pickup_code IS NULL OR NEW.pickup_code = '' THEN
    NEW.pickup_code := LPAD((FLOOR(RANDOM() * 9000) + 1000)::TEXT, 4, '0');
  END IF;

  -- Only assign / finalize sequential token numbers for PAID orders
  -- If order is paid, or transitioning from pending to paid:
  IF NEW.payment_status = 'paid' THEN
    -- If it doesn't already have a valid sequential token assigned
    IF NEW.token_number IS NULL OR NEW.token_number = '' OR (TG_OP = 'UPDATE' AND (OLD.payment_status IS DISTINCT FROM 'paid')) THEN
      SELECT COALESCE(MAX(
        CASE 
          WHEN token_number ~ '^\d+$' THEN token_number::INT 
          ELSE 0 
        END
      ), 0) + 1
      INTO v_next_token
      FROM public.orders
      WHERE canteen_id = NEW.canteen_id
        AND payment_status = 'paid'
        AND id != NEW.id
        AND created_at >= v_cycle_start;

      NEW.token_number := v_next_token::TEXT;
      NEW.pickup_token := v_next_token::TEXT;
      NEW.order_no := v_next_token;
    END IF;
  ELSE
    -- For pending / unpaid orders, keep token_number NULL so it never burns a slot
    IF TG_OP = 'INSERT' AND (NEW.token_number IS NULL OR NEW.token_number = '') THEN
      NEW.token_number := NULL;
      NEW.pickup_token := NULL;
    END IF;
  END IF;

  -- Keep pickup_token aligned with token_number if token_number exists
  IF NEW.token_number IS NOT NULL AND NEW.token_number != '' THEN
    NEW.pickup_token := NEW.token_number;
    IF NEW.order_no IS NULL OR NEW.order_no = 0 THEN
      IF NEW.token_number ~ '^\d+$' THEN
        NEW.order_no := NEW.token_number::INT;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger on both INSERT and UPDATE of payment_status
DROP TRIGGER IF EXISTS trg_order_token_and_pickup_code ON public.orders;
CREATE TRIGGER trg_order_token_and_pickup_code
BEFORE INSERT OR UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_token_and_pickup_code();
