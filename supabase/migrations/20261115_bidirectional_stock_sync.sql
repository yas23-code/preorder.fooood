-- 1. Function to sync menu_items -> daily_stock
CREATE OR REPLACE FUNCTION public.sync_menu_item_stock_to_daily()
RETURNS TRIGGER AS $$
DECLARE
  v_canteen_id UUID;
  v_qty INTEGER;
BEGIN
  -- Prevent trigger recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  v_canteen_id := NEW.canteen_id;
  IF v_canteen_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_qty := COALESCE(NEW.stock_quantity, NEW.stock_qty, 0);

  -- Upsert into daily_stock for CURRENT_DATE
  INSERT INTO public.daily_stock (
    canteen_id,
    menu_item_id,
    date,
    total_quantity,
    remaining_quantity,
    status,
    created_at,
    updated_at
  )
  VALUES (
    v_canteen_id,
    NEW.id,
    CURRENT_DATE,
    v_qty,
    v_qty,
    CASE 
      WHEN v_qty <= 0 OR NEW.is_available = FALSE THEN 'unavailable' 
      ELSE 'available' 
    END,
    now(),
    now()
  )
  ON CONFLICT (canteen_id, menu_item_id, date)
  DO UPDATE SET
    remaining_quantity = EXCLUDED.remaining_quantity,
    total_quantity = GREATEST(public.daily_stock.total_quantity, EXCLUDED.total_quantity),
    status = EXCLUDED.status,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on menu_items
DROP TRIGGER IF EXISTS trigger_sync_menu_item_stock ON public.menu_items;
CREATE TRIGGER trigger_sync_menu_item_stock
  AFTER INSERT OR UPDATE OF stock_quantity, stock_qty, is_available ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_menu_item_stock_to_daily();


-- 2. Function to sync daily_stock -> menu_items
CREATE OR REPLACE FUNCTION public.sync_daily_stock_to_menu_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Prevent trigger recursion
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Only sync if it's today's stock
  IF NEW.date = CURRENT_DATE THEN
    UPDATE public.menu_items
    SET
      stock_quantity = GREATEST(0, NEW.remaining_quantity),
      stock_qty = GREATEST(0, NEW.remaining_quantity),
      is_available = CASE 
        WHEN NEW.remaining_quantity <= 0 OR NEW.status = 'unavailable' THEN FALSE 
        ELSE TRUE 
      END
    WHERE id = NEW.menu_item_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on daily_stock
DROP TRIGGER IF EXISTS trigger_sync_daily_stock ON public.daily_stock;
CREATE TRIGGER trigger_sync_daily_stock
  AFTER INSERT OR UPDATE OF remaining_quantity, status ON public.daily_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_daily_stock_to_menu_item();


-- 3. Automatic order payment inventory deduction trigger for orders
CREATE OR REPLACE FUNCTION public.handle_order_paid_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid' OR OLD.inventory_deducted IS NOT TRUE) THEN
    PERFORM public.deduct_order_inventory(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_order_paid_inventory ON public.orders;
CREATE TRIGGER trigger_order_paid_inventory
  AFTER INSERT OR UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid')
  EXECUTE FUNCTION public.handle_order_paid_inventory();


-- 4. Initial seed: populate daily_stock with all current menu_items stock
INSERT INTO public.daily_stock (
  canteen_id,
  menu_item_id,
  date,
  total_quantity,
  remaining_quantity,
  status,
  created_at,
  updated_at
)
SELECT
  canteen_id,
  id,
  CURRENT_DATE,
  COALESCE(stock_quantity, stock_qty, 0),
  COALESCE(stock_quantity, stock_qty, 0),
  CASE 
    WHEN COALESCE(stock_quantity, stock_qty, 0) <= 0 OR is_available = FALSE THEN 'unavailable' 
    ELSE 'available' 
  END,
  now(),
  now()
FROM public.menu_items
ON CONFLICT (canteen_id, menu_item_id, date)
DO UPDATE SET
  remaining_quantity = EXCLUDED.remaining_quantity,
  total_quantity = GREATEST(public.daily_stock.total_quantity, EXCLUDED.total_quantity),
  status = EXCLUDED.status,
  updated_at = now();
