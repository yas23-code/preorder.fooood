CREATE OR REPLACE FUNCTION public.get_next_canteen_order_no(p_canteen_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cycle_start TIMESTAMPTZ;
  next_no integer;
BEGIN
  IF (now() AT TIME ZONE 'Asia/Kolkata')::time >= '22:00:00'::time THEN
    v_cycle_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '22 hours') AT TIME ZONE 'Asia/Kolkata';
  ELSE
    v_cycle_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') - interval '1 day' + interval '22 hours') AT TIME ZONE 'Asia/Kolkata';
  END IF;

  SELECT COALESCE(MAX(
    CASE 
      WHEN token_number ~ '^\d+$' THEN token_number::INT 
      ELSE 0 
    END
  ), 0) + 1
  INTO next_no
  FROM orders
  WHERE canteen_id = p_canteen_id
    AND payment_status = 'paid'
    AND created_at >= v_cycle_start;
  
  RETURN next_no;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_next_canteen_order_no(uuid) TO anon, authenticated, service_role;
