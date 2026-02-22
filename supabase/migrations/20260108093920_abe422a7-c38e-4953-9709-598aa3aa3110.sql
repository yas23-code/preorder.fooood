-- Add order_limit column to canteens table
ALTER TABLE public.canteens 
ADD COLUMN order_limit integer DEFAULT 50,
ADD COLUMN is_accepting_orders boolean NOT NULL DEFAULT true;

-- Create a function to get active order count for a canteen
CREATE OR REPLACE FUNCTION public.get_active_order_count(p_canteen_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer 
  FROM public.orders 
  WHERE canteen_id = p_canteen_id 
  AND status IN ('pending', 'ready')
  AND payment_status = 'paid';
$$;

-- Create a function to check if canteen can accept orders
CREATE OR REPLACE FUNCTION public.can_canteen_accept_orders(p_canteen_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN c.order_limit IS NULL THEN true
      WHEN c.is_accepting_orders = false THEN false
      ELSE (
        SELECT COUNT(*)::integer 
        FROM public.orders 
        WHERE canteen_id = p_canteen_id 
        AND status IN ('pending', 'ready')
        AND payment_status = 'paid'
      ) < c.order_limit
    END
  FROM public.canteens c
  WHERE c.id = p_canteen_id;
$$;