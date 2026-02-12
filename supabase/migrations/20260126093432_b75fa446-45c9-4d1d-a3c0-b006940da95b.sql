-- Create shop_images table for multiple images per shop
CREATE TABLE public.shop_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shop_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view shop images
CREATE POLICY "Anyone can view shop images"
ON public.shop_images
FOR SELECT
USING (true);

-- Shop owners can insert images for their shop
CREATE POLICY "Shop owners can insert images"
ON public.shop_images
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = shop_images.shop_id
  AND shops.owner_id = auth.uid()
));

-- Shop owners can update their shop images
CREATE POLICY "Shop owners can update images"
ON public.shop_images
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = shop_images.shop_id
  AND shops.owner_id = auth.uid()
));

-- Shop owners can delete their shop images
CREATE POLICY "Shop owners can delete images"
ON public.shop_images
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.shops
  WHERE shops.id = shop_images.shop_id
  AND shops.owner_id = auth.uid()
));

-- Create index for faster lookups
CREATE INDEX idx_shop_images_shop_id ON public.shop_images(shop_id, display_order);