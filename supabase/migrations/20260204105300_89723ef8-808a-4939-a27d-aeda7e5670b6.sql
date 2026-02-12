-- Update calculate_order_eta to count 'accepted' orders (in progress) instead of 'pending'
CREATE OR REPLACE FUNCTION public.calculate_order_eta(p_canteen_id uuid, p_item_ids uuid[])
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_prep_time integer;
  v_in_progress_orders integer;
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
  FROM menu_items mi
  WHERE mi.id = ANY(p_item_ids);

  -- Count in-progress orders (accepted status) for this canteen
  SELECT COUNT(*) INTO v_in_progress_orders
  FROM orders o
  WHERE o.canteen_id = p_canteen_id
    AND o.status = 'accepted'
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

  -- Calculate total minutes: (max_prep_time + (in_progress_orders * 2)) * peak_multiplier
  v_total_minutes := (v_max_prep_time + (v_in_progress_orders * 2)) * v_peak_multiplier;

  -- Calculate ETA
  v_eta := NOW() + (v_total_minutes || ' minutes')::interval;

  RETURN v_eta;
END;
$function$;

-- Update calculate_shop_order_eta to count 'accepted' or 'preparing' orders (in progress)
CREATE OR REPLACE FUNCTION public.calculate_shop_order_eta(p_shop_id uuid, p_item_ids uuid[])
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_max_prep_time integer;
  v_in_progress_orders integer;
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

  -- Count in-progress orders (accepted/confirmed/preparing status) for this shop
  SELECT COUNT(*) INTO v_in_progress_orders
  FROM shop_orders o
  WHERE o.shop_id = p_shop_id
    AND o.status IN ('accepted', 'confirmed', 'preparing')
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

  -- Calculate total minutes: (max_prep_time + (in_progress_orders * 2)) * peak_multiplier
  v_total_minutes := (v_max_prep_time + (v_in_progress_orders * 2)) * v_peak_multiplier;

  -- Calculate ETA
  v_eta := NOW() + (v_total_minutes || ' minutes')::interval;

  RETURN v_eta;
END;
$function$;

-- Update get_active_order_count to count 'accepted' orders (in progress) instead of 'pending'
CREATE OR REPLACE FUNCTION public.get_active_order_count(p_canteen_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM orders o
  WHERE o.canteen_id = p_canteen_id
    AND o.status = 'accepted'
    AND o.payment_status = 'paid';
  
  RETURN v_count;
END;
$function$;