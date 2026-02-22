-- Create shop_menu_items table for shop menu management
CREATE TABLE public.shop_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_menu_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view available menu items
CREATE POLICY "Anyone can view shop menu items"
ON public.shop_menu_items
FOR SELECT
USING (true);

-- Shop owners can manage their menu items
CREATE POLICY "Shop owners can insert menu items"
ON public.shop_menu_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_menu_items.shop_id
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can update menu items"
ON public.shop_menu_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_menu_items.shop_id
    AND shops.owner_id = auth.uid()
  )
);

CREATE POLICY "Shop owners can delete menu items"
ON public.shop_menu_items
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.shops
    WHERE shops.id = shop_menu_items.shop_id
    AND shops.owner_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_shop_menu_items_updated_at
BEFORE UPDATE ON public.shop_menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();