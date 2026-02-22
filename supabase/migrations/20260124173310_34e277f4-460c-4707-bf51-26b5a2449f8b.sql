-- Add prep_time to shop_menu_items
ALTER TABLE public.shop_menu_items 
ADD COLUMN IF NOT EXISTS prep_time integer DEFAULT 10;

-- Add estimated_ready_time to shop_orders
ALTER TABLE public.shop_orders 
ADD COLUMN IF NOT EXISTS estimated_ready_time timestamp with time zone;

-- Create function to calculate shop order ETA
CREATE OR REPLACE FUNCTION public.calculate_shop_order_eta(p_shop_id uuid, p_item_ids uuid[])
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_max_prep_time integer;
  v_pending_orders integer;
  v_peak_multiplier numeric;
  v_current_hour integer;
  v_total_minutes numeric;
  v_eta timestamp with time zone;
BEGIN
  -- Get the maximum prep_time from ordered items, with category defaults
  SELECT COALESCE(
    MAX(
      COALESCE(
        mi.prep_time,
        CASE 
          WHEN LOWER(mi.category) LIKE '%beverage%' OR LOWER(mi.category) LIKE '%drink%' OR LOWER(mi.category) LIKE '%juice%' OR LOWER(mi.category) LIKE '%shake%' OR LOWER(mi.category) LIKE '%coffee%' OR LOWER(mi.category) LIKE '%tea%' THEN 5
          WHEN LOWER(mi.category) LIKE '%snack%' OR LOWER(mi.category) LIKE '%fast food%' OR LOWER(mi.category) LIKE '%sandwich%' OR LOWER(mi.category) LIKE '%burger%' THEN 10
          WHEN LOWER(mi.category) LIKE '%main%' OR LOWER(mi.category) LIKE '%meal%' OR LOWER(mi.category) LIKE '%rice%' OR LOWER(mi.category) LIKE '%thali%' THEN 20
          WHEN LOWER(mi.category) LIKE '%dessert%' OR LOWER(mi.category) LIKE '%sweet%' OR LOWER(mi.category) LIKE '%ice%' THEN 7
          ELSE 10 -- Default fallback
        END
      )
    ),
    10 -- Fallback if no items found
  ) INTO v_max_prep_time
  FROM shop_menu_items mi
  WHERE mi.id = ANY(p_item_ids);

  -- Count pending orders for this shop
  SELECT COUNT(*) INTO v_pending_orders
  FROM shop_orders o
  WHERE o.shop_id = p_shop_id
    AND o.status = 'pending'
    AND o.payment_status = 'paid';

  -- Get current hour in IST (UTC+5:30)
  v_current_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'));

  -- Determine peak hour multiplier
  v_peak_multiplier := CASE
    WHEN v_current_hour >= 8 AND v_current_hour < 11 THEN 1.0
    WHEN v_current_hour >= 11 AND v_current_hour < 14 THEN 1.3
    WHEN v_current_hour >= 14 AND v_current_hour < 17 THEN 1.0
    WHEN v_current_hour >= 17 AND v_current_hour < 19 THEN 1.2
    ELSE 1.0 -- Default for other hours
  END;

  -- Calculate total minutes: (max_prep_time + (pending_orders * 2)) * peak_multiplier
  v_total_minutes := (v_max_prep_time + (v_pending_orders * 2)) * v_peak_multiplier;

  -- Calculate ETA
  v_eta := NOW() + (v_total_minutes || ' minutes')::interval;

  RETURN v_eta;
END;
$function$;