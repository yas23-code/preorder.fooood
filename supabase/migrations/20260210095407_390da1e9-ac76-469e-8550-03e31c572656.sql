
-- Add order_no column to orders table
ALTER TABLE public.orders ADD COLUMN order_no integer;

-- Create function to get next canteen order number (resets daily)
CREATE OR REPLACE FUNCTION public.get_next_canteen_order_no(p_canteen_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_no integer;
BEGIN
  SELECT COALESCE(MAX(order_no), 0) + 1
  INTO next_no
  FROM orders
  WHERE canteen_id = p_canteen_id
    AND created_at::date = CURRENT_DATE;
  
  RETURN next_no;
END;
$$;
