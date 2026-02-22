-- Add stock_mode column to canteens table
ALTER TABLE public.canteens 
ADD COLUMN stock_mode text NOT NULL DEFAULT 'simple' 
CHECK (stock_mode IN ('simple', 'daily'));

-- Create daily_stock table for tracking daily stock
CREATE TABLE public.daily_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canteen_id uuid NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_quantity integer NOT NULL CHECK (total_quantity >= 0),
  remaining_quantity integer NOT NULL CHECK (remaining_quantity >= 0),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'unavailable')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, date)
);

-- Enable RLS
ALTER TABLE public.daily_stock ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_stock
CREATE POLICY "Anyone can view daily stock"
ON public.daily_stock FOR SELECT
USING (true);

CREATE POLICY "Vendors can insert daily stock for their canteen"
ON public.daily_stock FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.canteens
    WHERE canteens.id = daily_stock.canteen_id
    AND canteens.vendor_id = auth.uid()
  )
);

CREATE POLICY "Vendors can update daily stock for their canteen"
ON public.daily_stock FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.canteens
    WHERE canteens.id = daily_stock.canteen_id
    AND canteens.vendor_id = auth.uid()
  )
);

CREATE POLICY "Vendors can delete daily stock for their canteen"
ON public.daily_stock FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.canteens
    WHERE canteens.id = daily_stock.canteen_id
    AND canteens.vendor_id = auth.uid()
  )
);

-- Create index for fast lookups
CREATE INDEX idx_daily_stock_item_date ON public.daily_stock(menu_item_id, date);
CREATE INDEX idx_daily_stock_canteen_date ON public.daily_stock(canteen_id, date);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_stock_updated_at
BEFORE UPDATE ON public.daily_stock
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to reduce stock and check availability
CREATE OR REPLACE FUNCTION public.reduce_daily_stock(
  p_menu_item_id uuid,
  p_quantity integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock daily_stock%ROWTYPE;
  v_canteen canteens%ROWTYPE;
BEGIN
  -- Get the canteen for this menu item
  SELECT c.* INTO v_canteen
  FROM canteens c
  JOIN menu_items mi ON mi.canteen_id = c.id
  WHERE mi.id = p_menu_item_id;
  
  -- If simple mode, always allow
  IF v_canteen.stock_mode = 'simple' THEN
    RETURN json_build_object('success', true, 'mode', 'simple');
  END IF;
  
  -- Get today's stock for this item
  SELECT * INTO v_stock
  FROM daily_stock
  WHERE menu_item_id = p_menu_item_id
  AND date = CURRENT_DATE
  FOR UPDATE;
  
  -- If no stock record for today, block order
  IF v_stock IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Stock not set for today');
  END IF;
  
  -- Check if enough stock
  IF v_stock.remaining_quantity < p_quantity THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient stock', 'remaining', v_stock.remaining_quantity);
  END IF;
  
  -- Reduce stock
  UPDATE daily_stock
  SET 
    remaining_quantity = remaining_quantity - p_quantity,
    status = CASE WHEN remaining_quantity - p_quantity = 0 THEN 'unavailable' ELSE 'available' END,
    updated_at = now()
  WHERE id = v_stock.id;
  
  RETURN json_build_object('success', true, 'remaining', v_stock.remaining_quantity - p_quantity);
END;
$$;

-- Function to check if item is available for ordering
CREATE OR REPLACE FUNCTION public.check_item_availability(
  p_menu_item_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_canteen canteens%ROWTYPE;
  v_menu_item menu_items%ROWTYPE;
  v_stock daily_stock%ROWTYPE;
BEGIN
  -- Get menu item
  SELECT * INTO v_menu_item
  FROM menu_items
  WHERE id = p_menu_item_id;
  
  IF v_menu_item IS NULL THEN
    RETURN json_build_object('available', false, 'reason', 'Item not found');
  END IF;
  
  -- Check if manually marked unavailable
  IF NOT v_menu_item.is_available THEN
    RETURN json_build_object('available', false, 'reason', 'Item unavailable');
  END IF;
  
  -- Get canteen
  SELECT * INTO v_canteen
  FROM canteens
  WHERE id = v_menu_item.canteen_id;
  
  -- If simple mode, item is available
  IF v_canteen.stock_mode = 'simple' THEN
    RETURN json_build_object('available', true, 'mode', 'simple');
  END IF;
  
  -- Daily mode: check today's stock
  SELECT * INTO v_stock
  FROM daily_stock
  WHERE menu_item_id = p_menu_item_id
  AND date = CURRENT_DATE;
  
  IF v_stock IS NULL THEN
    RETURN json_build_object('available', false, 'reason', 'Stock not set for today');
  END IF;
  
  IF v_stock.status = 'unavailable' OR v_stock.remaining_quantity = 0 THEN
    RETURN json_build_object('available', false, 'reason', 'Sold out', 'remaining', 0);
  END IF;
  
  RETURN json_build_object('available', true, 'mode', 'daily', 'remaining', v_stock.remaining_quantity);
END;
$$;