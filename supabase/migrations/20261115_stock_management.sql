CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.canteens ADD COLUMN IF NOT EXISTS stock_mode TEXT NOT NULL DEFAULT 'simple';

CREATE TABLE IF NOT EXISTS public.daily_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT daily_stock_canteen_item_date_unique UNIQUE (canteen_id, menu_item_id, date)
);

ALTER TABLE public.daily_stock ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view daily stock" ON public.daily_stock;
CREATE POLICY "Anyone can view daily stock" ON public.daily_stock FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendors can insert daily stock for their canteen" ON public.daily_stock;
CREATE POLICY "Vendors can insert daily stock for their canteen" ON public.daily_stock FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM canteens WHERE canteens.id = daily_stock.canteen_id AND canteens.vendor_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can update daily stock for their canteen" ON public.daily_stock;
CREATE POLICY "Vendors can update daily stock for their canteen" ON public.daily_stock FOR UPDATE USING (
  EXISTS (SELECT 1 FROM canteens WHERE canteens.id = daily_stock.canteen_id AND canteens.vendor_id = auth.uid())
);

DROP POLICY IF EXISTS "Vendors can delete daily stock for their canteen" ON public.daily_stock;
CREATE POLICY "Vendors can delete daily stock for their canteen" ON public.daily_stock FOR DELETE USING (
  EXISTS (SELECT 1 FROM canteens WHERE canteens.id = daily_stock.canteen_id AND canteens.vendor_id = auth.uid())
);

CREATE OR REPLACE FUNCTION public.reduce_daily_stock(p_menu_item_id uuid, p_quantity integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stock daily_stock%ROWTYPE;
  v_canteen canteens%ROWTYPE;
BEGIN
  SELECT c.* INTO v_canteen FROM canteens c JOIN menu_items mi ON mi.canteen_id = c.id WHERE mi.id = p_menu_item_id;
  IF v_canteen.stock_mode = 'simple' THEN 
    RETURN json_build_object('success', true, 'mode', 'simple'); 
  END IF;
  
  SELECT * INTO v_stock FROM daily_stock WHERE menu_item_id = p_menu_item_id AND date = CURRENT_DATE FOR UPDATE;
  IF v_stock IS NULL THEN 
    RETURN json_build_object('success', false, 'error', 'Stock not set for today'); 
  END IF;
  
  IF v_stock.remaining_quantity < p_quantity THEN 
    RETURN json_build_object('success', false, 'error', 'Insufficient stock', 'remaining', v_stock.remaining_quantity); 
  END IF;
  
  UPDATE daily_stock SET
    remaining_quantity = remaining_quantity - p_quantity,
    status = CASE WHEN remaining_quantity - p_quantity = 0 THEN 'unavailable' ELSE 'available' END,
    updated_at = now()
  WHERE id = v_stock.id;
  
  RETURN json_build_object('success', true, 'remaining', v_stock.remaining_quantity - p_quantity);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_menu_item_availability(p_menu_item_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_canteen canteens%ROWTYPE;
  v_menu_item menu_items%ROWTYPE;
  v_stock daily_stock%ROWTYPE;
BEGIN
  SELECT * INTO v_menu_item FROM menu_items WHERE id = p_menu_item_id;
  IF v_menu_item IS NULL THEN 
    RETURN json_build_object('available', false, 'reason', 'Item not found'); 
  END IF;
  IF NOT v_menu_item.is_available THEN 
    RETURN json_build_object('available', false, 'reason', 'Item unavailable'); 
  END IF;
  
  SELECT * INTO v_canteen FROM canteens WHERE id = v_menu_item.canteen_id;
  IF v_canteen.stock_mode = 'simple' THEN 
    RETURN json_build_object('available', true, 'mode', 'simple'); 
  END IF;
  
  SELECT * INTO v_stock FROM daily_stock WHERE menu_item_id = p_menu_item_id AND date = CURRENT_DATE;
  IF v_stock IS NULL THEN 
    RETURN json_build_object('available', false, 'reason', 'Stock not set for today'); 
  END IF;
  IF v_stock.status = 'unavailable' OR v_stock.remaining_quantity = 0 THEN 
    RETURN json_build_object('available', false, 'reason', 'Sold out', 'remaining', 0); 
  END IF;
  
  RETURN json_build_object('available', true, 'mode', 'daily', 'remaining', v_stock.remaining_quantity);
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_stock_updated_at'
  ) THEN
    CREATE TRIGGER update_daily_stock_updated_at
      BEFORE UPDATE ON public.daily_stock
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_stock;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
