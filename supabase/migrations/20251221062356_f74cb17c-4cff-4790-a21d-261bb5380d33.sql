-- Create enums
CREATE TYPE public.user_role AS ENUM ('student', 'vendor');
CREATE TYPE public.order_status AS ENUM ('pending', 'ready', 'completed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create canteens table
CREATE TABLE public.canteens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id) ON DELETE CASCADE,
  total NUMERIC NOT NULL CHECK (total >= 0),
  status order_status NOT NULL DEFAULT 'pending',
  pickup_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles for orders"
  ON public.profiles FOR SELECT
  USING (true);

-- Canteens policies (everyone can view, only vendor owner can modify)
CREATE POLICY "Anyone can view canteens"
  ON public.canteens FOR SELECT
  USING (true);

CREATE POLICY "Vendors can create their own canteen"
  ON public.canteens FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update their own canteen"
  ON public.canteens FOR UPDATE
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete their own canteen"
  ON public.canteens FOR DELETE
  USING (auth.uid() = vendor_id);

-- Categories policies
CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage categories of their canteen"
  ON public.categories FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = categories.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

CREATE POLICY "Vendors can update categories of their canteen"
  ON public.categories FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = categories.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

CREATE POLICY "Vendors can delete categories of their canteen"
  ON public.categories FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = categories.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

-- Menu items policies
CREATE POLICY "Anyone can view available menu items"
  ON public.menu_items FOR SELECT
  USING (true);

CREATE POLICY "Vendors can manage menu items of their canteen"
  ON public.menu_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = menu_items.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

CREATE POLICY "Vendors can update menu items of their canteen"
  ON public.menu_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = menu_items.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

CREATE POLICY "Vendors can delete menu items of their canteen"
  ON public.menu_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = menu_items.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

-- Orders policies
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Vendors can view orders for their canteen"
  ON public.orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = orders.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

CREATE POLICY "Users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Vendors can update order status"
  ON public.orders FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.canteens 
    WHERE canteens.id = orders.canteen_id 
    AND canteens.vendor_id = auth.uid()
  ));

-- Order items policies
CREATE POLICY "Users can view their own order items"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

CREATE POLICY "Vendors can view order items for their canteen"
  ON public.order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    JOIN public.canteens ON canteens.id = orders.canteen_id
    WHERE orders.id = order_items.order_id 
    AND canteens.vendor_id = auth.uid()
  ));

CREATE POLICY "Users can create order items"
  ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.user_id = auth.uid()
  ));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_canteens_updated_at
  BEFORE UPDATE ON public.canteens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;