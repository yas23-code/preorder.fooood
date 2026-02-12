-- Create shop_orders table
CREATE TABLE public.shop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  payment_id TEXT,
  payment_session_id TEXT,
  pickup_code TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shop_order_items table
CREATE TABLE public.shop_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.shop_menu_items(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL
);

-- Enable RLS on shop_orders
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_orders
CREATE POLICY "Users can view their own shop orders"
ON public.shop_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create shop orders"
ON public.shop_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Shop owners can view orders for their shop"
ON public.shop_orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_orders.shop_id
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can update order status"
ON public.shop_orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_orders.shop_id
    AND shops.owner_id = auth.uid()
  )
);

-- Enable RLS on shop_order_items
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for shop_order_items
CREATE POLICY "Users can view their own shop order items"
ON public.shop_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shop_orders
    WHERE shop_orders.id = shop_order_items.order_id
    AND shop_orders.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create shop order items"
ON public.shop_order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shop_orders
    WHERE shop_orders.id = shop_order_items.order_id
    AND shop_orders.user_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can view order items for their shop"
ON public.shop_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.shop_orders
    JOIN public.shops ON shops.id = shop_orders.shop_id
    WHERE shop_orders.id = shop_order_items.order_id
    AND shops.owner_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_shop_orders_updated_at
BEFORE UPDATE ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();