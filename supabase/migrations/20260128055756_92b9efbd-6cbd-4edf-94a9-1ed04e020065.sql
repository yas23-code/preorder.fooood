-- Add order_no column to shop_orders table
ALTER TABLE public.shop_orders ADD COLUMN order_no integer;

-- Create function to get next order number for a shop (resets daily)
CREATE OR REPLACE FUNCTION public.get_next_shop_order_no(p_shop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_order_no integer;
  v_current_date date;
BEGIN
  -- Get current date in IST
  v_current_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
  
  -- Get the last order number for this shop today
  SELECT order_no INTO v_last_order_no
  FROM shop_orders
  WHERE shop_id = p_shop_id
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_current_date
    AND order_no IS NOT NULL
  ORDER BY order_no DESC
  LIMIT 1;
  
  -- Return next number or 1 if no orders today
  IF v_last_order_no IS NULL THEN
    RETURN 1;
  ELSE
    RETURN v_last_order_no + 1;
  END IF;
END;
$$;