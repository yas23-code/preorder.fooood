-- Create shops table for location-based food ordering
CREATE TABLE public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can view shops (for listing)
CREATE POLICY "Anyone can view shops"
ON public.shops
FOR SELECT
USING (true);

-- Shop owners can create their own shop
CREATE POLICY "Owners can create their own shop"
ON public.shops
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Shop owners can update their own shop
CREATE POLICY "Owners can update their own shop"
ON public.shops
FOR UPDATE
USING (auth.uid() = owner_id);

-- Shop owners can delete their own shop
CREATE POLICY "Owners can delete their own shop"
ON public.shops
FOR DELETE
USING (auth.uid() = owner_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on location for faster queries
CREATE INDEX idx_shops_location ON public.shops (latitude, longitude);

-- Create index on is_open for filtering
CREATE INDEX idx_shops_is_open ON public.shops (is_open);