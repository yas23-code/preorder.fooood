-- ============================================================
-- PreOrder Database Migration Script
-- Generated: 2026-02-11
-- Compatible with a fresh Supabase project
-- ============================================================

-- ============================================================
-- 1. EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- ============================================================
-- 2. ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('student', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'accepted', 'ready', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.super_admin_role AS ENUM ('super_admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 3. TABLES
-- ============================================================

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'student'::user_role,
  phone TEXT,
  telegram_chat_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- canteens
CREATE TABLE IF NOT EXISTS public.canteens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  is_accepting_orders BOOLEAN NOT NULL DEFAULT true,
  order_limit INTEGER DEFAULT 50,
  vendor_email TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  stock_mode TEXT NOT NULL DEFAULT 'simple',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- menu_items
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id),
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  prep_time INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  canteen_id UUID NOT NULL REFERENCES public.canteens(id),
  total NUMERIC NOT NULL,
  status public.order_status NOT NULL DEFAULT 'pending'::order_status,
  pickup_code TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  payment_session_id TEXT,
  estimated_ready_time TIMESTAMPTZ,
  qr_token TEXT,
  qr_used BOOLEAN NOT NULL DEFAULT false,
  order_no INTEGER,
  customer_phone TEXT,
  platform_fee NUMERIC DEFAULT 0,
  pg_fee NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- order_items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL
);

-- shops
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  shop_type TEXT NOT NULL DEFAULT 'public',
  approval_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- shop_images
CREATE TABLE IF NOT EXISTS public.shop_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- shop_menu_items
CREATE TABLE IF NOT EXISTS public.shop_menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  prep_time INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- shop_orders
CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  total NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  pickup_code TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  payment_session_id TEXT,
  estimated_ready_time TIMESTAMPTZ,
  qr_token TEXT,
  qr_used BOOLEAN NOT NULL DEFAULT false,
  order_no INTEGER,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  platform_fee NUMERIC DEFAULT 0,
  pg_fee NUMERIC DEFAULT 0,
  net_profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- shop_order_items
CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.shop_orders(id),
  menu_item_id UUID NOT NULL REFERENCES public.shop_menu_items(id),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL
);

-- college_config
CREATE TABLE IF NOT EXISTS public.college_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  campus_radius_meters INTEGER NOT NULL DEFAULT 500,
  is_active BOOLEAN NOT NULL DEFAULT true,
  show_nearby_shops BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.super_admin_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- bans
CREATE TABLE IF NOT EXISTS public.bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  ban_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  banned_by UUID NOT NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  minimum_amount NUMERIC DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  vendor_id UUID,
  canteen_id UUID REFERENCES public.canteens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- crown_balances
CREATE TABLE IF NOT EXISTS public.crown_balances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  lifetime_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- crown_rewards
CREATE TABLE IF NOT EXISTS public.crown_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_type TEXT NOT NULL,
  crowns_required INTEGER NOT NULL,
  discount_value NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- crown_transactions
CREATE TABLE IF NOT EXISTS public.crown_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- redeemed_rewards
CREATE TABLE IF NOT EXISTS public.redeemed_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES public.crown_rewards(id),
  coupon_code TEXT NOT NULL,
  discount_value NUMERIC NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- daily_stock
CREATE TABLE IF NOT EXISTS public.daily_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_quantity INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- notification_queue
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- fcm_tokens
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- push_subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- email_notifications_sent
CREATE TABLE IF NOT EXISTS public.email_notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- shop_email_notifications_sent
CREATE TABLE IF NOT EXISTS public.shop_email_notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE REFERENCES public.shop_orders(id),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- order_rejection_notifications
CREATE TABLE IF NOT EXISTS public.order_rejection_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  user_id UUID NOT NULL,
  canteen_id UUID NOT NULL REFERENCES public.canteens(id),
  canteen_name TEXT NOT NULL,
  rejection_reason TEXT,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- telegram_pending_links
CREATE TABLE IF NOT EXISTS public.telegram_pending_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  link_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- telegram_notifications_sent
CREATE TABLE IF NOT EXISTS public.telegram_notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- telegram_polling_state
CREATE TABLE IF NOT EXISTS public.telegram_polling_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  last_update_id BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. DATABASE FUNCTIONS
-- ============================================================

-- handle_new_user (auth trigger)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Auth trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_canteens_updated_at BEFORE UPDATE ON public.canteens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON public.menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON public.shops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shop_menu_items_updated_at BEFORE UPDATE ON public.shop_menu_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_shop_orders_updated_at BEFORE UPDATE ON public.shop_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_college_config_updated_at BEFORE UPDATE ON public.college_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_stock_updated_at BEFORE UPDATE ON public.daily_stock FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crown_balances_updated_at BEFORE UPDATE ON public.crown_balances FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_crown_rewards_updated_at BEFORE UPDATE ON public.crown_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fcm_tokens_updated_at BEFORE UPDATE ON public.fcm_tokens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_push_subscriptions_updated_at BEFORE UPDATE ON public.push_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- has_super_admin_role
CREATE OR REPLACE FUNCTION public.has_super_admin_role(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- is_banned
CREATE OR REPLACE FUNCTION public.is_banned(_target_id uuid, _target_type text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bans
    WHERE target_id = _target_id
      AND target_type = _target_type
      AND is_active = true
      AND (ban_type = 'permanent' OR (ban_type = 'temporary' AND expires_at > now()))
  )
$$;

-- generate_qr_token
CREATE OR REPLACE FUNCTION public.generate_qr_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$;

-- set_qr_token_on_payment
CREATE OR REPLACE FUNCTION public.set_qr_token_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') AND NEW.qr_token IS NULL THEN
    NEW.qr_token := encode(extensions.gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- QR token triggers
CREATE TRIGGER trigger_set_qr_token_orders
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token_on_payment();

CREATE TRIGGER trigger_set_qr_token_shop_orders
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_qr_token_on_payment();

-- get_next_canteen_order_no
CREATE OR REPLACE FUNCTION public.get_next_canteen_order_no(p_canteen_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_no integer;
BEGIN
  SELECT COALESCE(MAX(order_no), 0) + 1 INTO next_no
  FROM orders
  WHERE canteen_id = p_canteen_id AND created_at::date = CURRENT_DATE;
  RETURN next_no;
END;
$$;

-- get_next_shop_order_no
CREATE OR REPLACE FUNCTION public.get_next_shop_order_no(p_shop_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_last_order_no integer;
  v_current_date date;
BEGIN
  v_current_date := (NOW() AT TIME ZONE 'Asia/Kolkata')::date;
  SELECT order_no INTO v_last_order_no
  FROM shop_orders
  WHERE shop_id = p_shop_id
    AND (created_at AT TIME ZONE 'Asia/Kolkata')::date = v_current_date
    AND order_no IS NOT NULL
  ORDER BY order_no DESC LIMIT 1;
  IF v_last_order_no IS NULL THEN RETURN 1;
  ELSE RETURN v_last_order_no + 1;
  END IF;
END;
$$;

-- can_canteen_accept_orders
CREATE OR REPLACE FUNCTION public.can_canteen_accept_orders(p_canteen_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    CASE
      WHEN c.order_limit IS NULL THEN true
      WHEN c.is_accepting_orders = false THEN false
      ELSE (
        SELECT COUNT(*)::integer FROM public.orders
        WHERE canteen_id = p_canteen_id AND status IN ('pending', 'ready') AND payment_status = 'paid'
      ) < c.order_limit
    END
  FROM public.canteens c WHERE c.id = p_canteen_id;
$$;

-- get_active_order_count
CREATE OR REPLACE FUNCTION public.get_active_order_count(p_canteen_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count FROM orders o
  WHERE o.canteen_id = p_canteen_id AND o.status = 'accepted' AND o.payment_status = 'paid';
  RETURN v_count;
END;
$$;

-- add_crowns_for_order
CREATE OR REPLACE FUNCTION public.add_crowns_for_order(p_user_id uuid, p_order_id uuid, p_order_total numeric)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE crowns_earned integer;
BEGIN
  crowns_earned := FLOOR(p_order_total / 10);
  IF crowns_earned <= 0 THEN RETURN 0; END IF;
  INSERT INTO public.crown_balances (user_id, balance, lifetime_earned)
  VALUES (p_user_id, crowns_earned, crowns_earned)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = crown_balances.balance + crowns_earned,
    lifetime_earned = crown_balances.lifetime_earned + crowns_earned,
    updated_at = now();
  INSERT INTO public.crown_transactions (user_id, order_id, amount, type, description)
  VALUES (p_user_id, p_order_id, crowns_earned, 'earned', 'Earned from order');
  RETURN crowns_earned;
END;
$$;

-- redeem_crown_reward
CREATE OR REPLACE FUNCTION public.redeem_crown_reward(p_user_id uuid, p_reward_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reward crown_rewards%ROWTYPE;
  v_current_balance integer;
  v_coupon_code text;
BEGIN
  SELECT * INTO v_reward FROM public.crown_rewards WHERE id = p_reward_id AND is_active = true;
  IF v_reward IS NULL THEN RETURN json_build_object('success', false, 'error', 'Reward not found or inactive'); END IF;
  SELECT balance INTO v_current_balance FROM public.crown_balances WHERE user_id = p_user_id;
  IF v_current_balance IS NULL OR v_current_balance < v_reward.crowns_required THEN
    RETURN json_build_object('success', false, 'error', 'Not enough crowns');
  END IF;
  v_coupon_code := 'CROWN' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8));
  UPDATE public.crown_balances SET balance = balance - v_reward.crowns_required, updated_at = now() WHERE user_id = p_user_id;
  INSERT INTO public.crown_transactions (user_id, amount, type, description)
  VALUES (p_user_id, v_reward.crowns_required, 'redeemed', 'Redeemed: ' || v_reward.name);
  INSERT INTO public.redeemed_rewards (user_id, reward_id, coupon_code, discount_value)
  VALUES (p_user_id, p_reward_id, v_coupon_code, v_reward.discount_value);
  RETURN json_build_object('success', true, 'coupon_code', v_coupon_code, 'discount_value', v_reward.discount_value, 'reward_name', v_reward.name);
END;
$$;

-- verify_qr_and_complete_order
CREATE OR REPLACE FUNCTION public.verify_qr_and_complete_order(p_qr_token text, p_vendor_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_canteen canteens%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE qr_token = p_qr_token;
  IF v_order IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid QR code'); END IF;
  IF v_order.qr_used THEN RETURN json_build_object('success', false, 'error', 'QR code already used'); END IF;
  IF v_order.payment_status != 'paid' THEN RETURN json_build_object('success', false, 'error', 'Payment not confirmed'); END IF;
  IF v_order.status != 'ready' THEN RETURN json_build_object('success', false, 'error', 'Order not ready for pickup. Current status: ' || v_order.status::text); END IF;
  SELECT * INTO v_canteen FROM canteens WHERE id = v_order.canteen_id;
  IF v_canteen.vendor_id != p_vendor_id THEN RETURN json_build_object('success', false, 'error', 'This order belongs to a different vendor'); END IF;
  UPDATE orders SET status = 'completed', qr_used = true, updated_at = now() WHERE id = v_order.id;
  RETURN json_build_object('success', true, 'order_id', v_order.id, 'message', 'Order completed successfully');
END;
$$;

-- verify_qr_and_complete_shop_order
CREATE OR REPLACE FUNCTION public.verify_qr_and_complete_shop_order(p_qr_token text, p_owner_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order shop_orders%ROWTYPE;
  v_shop shops%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM shop_orders WHERE qr_token = p_qr_token;
  IF v_order IS NULL THEN RETURN json_build_object('success', false, 'error', 'Invalid QR code'); END IF;
  IF v_order.qr_used THEN RETURN json_build_object('success', false, 'error', 'QR code already used'); END IF;
  IF v_order.payment_status != 'paid' THEN RETURN json_build_object('success', false, 'error', 'Payment not confirmed'); END IF;
  IF v_order.status != 'ready' THEN RETURN json_build_object('success', false, 'error', 'Order not ready for pickup. Current status: ' || v_order.status); END IF;
  SELECT * INTO v_shop FROM shops WHERE id = v_order.shop_id;
  IF v_shop.owner_id != p_owner_id THEN RETURN json_build_object('success', false, 'error', 'This order belongs to a different vendor'); END IF;
  UPDATE shop_orders SET status = 'completed', qr_used = true, updated_at = now() WHERE id = v_order.id;
  RETURN json_build_object('success', true, 'order_id', v_order.id, 'message', 'Order completed successfully');
END;
$$;

-- reduce_daily_stock
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
  IF v_canteen.stock_mode = 'simple' THEN RETURN json_build_object('success', true, 'mode', 'simple'); END IF;
  SELECT * INTO v_stock FROM daily_stock WHERE menu_item_id = p_menu_item_id AND date = CURRENT_DATE FOR UPDATE;
  IF v_stock IS NULL THEN RETURN json_build_object('success', false, 'error', 'Stock not set for today'); END IF;
  IF v_stock.remaining_quantity < p_quantity THEN RETURN json_build_object('success', false, 'error', 'Insufficient stock', 'remaining', v_stock.remaining_quantity); END IF;
  UPDATE daily_stock SET
    remaining_quantity = remaining_quantity - p_quantity,
    status = CASE WHEN remaining_quantity - p_quantity = 0 THEN 'unavailable' ELSE 'available' END,
    updated_at = now()
  WHERE id = v_stock.id;
  RETURN json_build_object('success', true, 'remaining', v_stock.remaining_quantity - p_quantity);
END;
$$;

-- check_item_availability
CREATE OR REPLACE FUNCTION public.check_item_availability(p_menu_item_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_canteen canteens%ROWTYPE;
  v_menu_item menu_items%ROWTYPE;
  v_stock daily_stock%ROWTYPE;
BEGIN
  SELECT * INTO v_menu_item FROM menu_items WHERE id = p_menu_item_id;
  IF v_menu_item IS NULL THEN RETURN json_build_object('available', false, 'reason', 'Item not found'); END IF;
  IF NOT v_menu_item.is_available THEN RETURN json_build_object('available', false, 'reason', 'Item unavailable'); END IF;
  SELECT * INTO v_canteen FROM canteens WHERE id = v_menu_item.canteen_id;
  IF v_canteen.stock_mode = 'simple' THEN RETURN json_build_object('available', true, 'mode', 'simple'); END IF;
  SELECT * INTO v_stock FROM daily_stock WHERE menu_item_id = p_menu_item_id AND date = CURRENT_DATE;
  IF v_stock IS NULL THEN RETURN json_build_object('available', false, 'reason', 'Stock not set for today'); END IF;
  IF v_stock.status = 'unavailable' OR v_stock.remaining_quantity = 0 THEN RETURN json_build_object('available', false, 'reason', 'Sold out', 'remaining', 0); END IF;
  RETURN json_build_object('available', true, 'mode', 'daily', 'remaining', v_stock.remaining_quantity);
END;
$$;

-- calculate_order_eta
CREATE OR REPLACE FUNCTION public.calculate_order_eta(p_canteen_id uuid, p_item_ids uuid[])
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_prep_time integer;
  v_in_progress_orders integer;
  v_peak_multiplier numeric;
  v_current_hour integer;
  v_total_minutes numeric;
  v_eta timestamp with time zone;
BEGIN
  SELECT COALESCE(MAX(COALESCE(mi.prep_time,
    CASE
      WHEN LOWER(mi.category) LIKE '%beverage%' OR LOWER(mi.category) LIKE '%drink%' OR LOWER(mi.category) LIKE '%juice%' OR LOWER(mi.category) LIKE '%shake%' OR LOWER(mi.category) LIKE '%coffee%' OR LOWER(mi.category) LIKE '%tea%' THEN 5
      WHEN LOWER(mi.category) LIKE '%snack%' OR LOWER(mi.category) LIKE '%fast food%' OR LOWER(mi.category) LIKE '%sandwich%' OR LOWER(mi.category) LIKE '%burger%' THEN 10
      WHEN LOWER(mi.category) LIKE '%main%' OR LOWER(mi.category) LIKE '%meal%' OR LOWER(mi.category) LIKE '%rice%' OR LOWER(mi.category) LIKE '%thali%' THEN 20
      WHEN LOWER(mi.category) LIKE '%dessert%' OR LOWER(mi.category) LIKE '%sweet%' OR LOWER(mi.category) LIKE '%ice%' THEN 7
      ELSE 10
    END
  )), 10) INTO v_max_prep_time FROM menu_items mi WHERE mi.id = ANY(p_item_ids);
  SELECT COUNT(*) INTO v_in_progress_orders FROM orders o WHERE o.canteen_id = p_canteen_id AND o.status = 'accepted' AND o.payment_status = 'paid';
  v_current_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'));
  v_peak_multiplier := CASE
    WHEN v_current_hour >= 11 AND v_current_hour < 14 THEN 1.3
    WHEN v_current_hour >= 17 AND v_current_hour < 19 THEN 1.2
    ELSE 1.0
  END;
  v_total_minutes := (v_max_prep_time + (v_in_progress_orders * 2)) * v_peak_multiplier;
  v_eta := NOW() + (v_total_minutes || ' minutes')::interval;
  RETURN v_eta;
END;
$$;

-- calculate_shop_order_eta
CREATE OR REPLACE FUNCTION public.calculate_shop_order_eta(p_shop_id uuid, p_item_ids uuid[])
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_max_prep_time integer;
  v_in_progress_orders integer;
  v_peak_multiplier numeric;
  v_current_hour integer;
  v_total_minutes numeric;
  v_eta timestamp with time zone;
BEGIN
  SELECT COALESCE(MAX(COALESCE(mi.prep_time,
    CASE
      WHEN LOWER(mi.category) LIKE '%beverage%' OR LOWER(mi.category) LIKE '%drink%' OR LOWER(mi.category) LIKE '%juice%' OR LOWER(mi.category) LIKE '%shake%' OR LOWER(mi.category) LIKE '%coffee%' OR LOWER(mi.category) LIKE '%tea%' THEN 5
      WHEN LOWER(mi.category) LIKE '%snack%' OR LOWER(mi.category) LIKE '%fast food%' OR LOWER(mi.category) LIKE '%sandwich%' OR LOWER(mi.category) LIKE '%burger%' THEN 10
      WHEN LOWER(mi.category) LIKE '%main%' OR LOWER(mi.category) LIKE '%meal%' OR LOWER(mi.category) LIKE '%rice%' OR LOWER(mi.category) LIKE '%thali%' THEN 20
      WHEN LOWER(mi.category) LIKE '%dessert%' OR LOWER(mi.category) LIKE '%sweet%' OR LOWER(mi.category) LIKE '%ice%' THEN 7
      ELSE 10
    END
  )), 10) INTO v_max_prep_time FROM shop_menu_items mi WHERE mi.id = ANY(p_item_ids);
  SELECT COUNT(*) INTO v_in_progress_orders FROM shop_orders o WHERE o.shop_id = p_shop_id AND o.status IN ('accepted', 'confirmed', 'preparing') AND o.payment_status = 'paid';
  v_current_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Kolkata'));
  v_peak_multiplier := CASE
    WHEN v_current_hour >= 11 AND v_current_hour < 14 THEN 1.3
    WHEN v_current_hour >= 17 AND v_current_hour < 19 THEN 1.2
    ELSE 1.0
  END;
  v_total_minutes := (v_max_prep_time + (v_in_progress_orders * 2)) * v_peak_multiplier;
  v_eta := NOW() + (v_total_minutes || ' minutes')::interval;
  RETURN v_eta;
END;
$$;

-- notify_order_status_change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  canteen_name text;
  notification_title text;
  notification_message text;
BEGIN
  IF NEW.status IN ('ready', 'completed') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    SELECT name INTO canteen_name FROM public.canteens WHERE id = NEW.canteen_id;
    IF NEW.status = 'ready' THEN
      notification_title := 'Order Ready for Pickup! 🎉';
      notification_message := 'Your order from ' || COALESCE(canteen_name, 'the canteen') || ' is ready. Pickup code: ' || COALESCE(NEW.pickup_code, 'N/A');
    ELSE
      notification_title := 'Order Completed ✅';
      notification_message := 'Your order from ' || COALESCE(canteen_name, 'the canteen') || ' has been completed. Thank you!';
    END IF;
    INSERT INTO public.notification_queue (user_id, title, message, order_id, created_at)
    VALUES (NEW.user_id, notification_title, notification_message, NEW.id, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- ============================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canteens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.college_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crown_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crown_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crown_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redeemed_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_email_notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_rejection_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_pending_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_polling_state ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Public profiles for orders" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- canteens
CREATE POLICY "Anyone can view approved canteens" ON public.canteens FOR SELECT USING (approval_status = 'approved' OR auth.uid() = vendor_id OR has_super_admin_role(auth.uid()));
CREATE POLICY "Vendors can create their own canteen" ON public.canteens FOR INSERT WITH CHECK (auth.uid() = vendor_id);
CREATE POLICY "Vendors can update their own canteen" ON public.canteens FOR UPDATE USING (auth.uid() = vendor_id);
CREATE POLICY "Vendors can delete their own canteen" ON public.canteens FOR DELETE USING (auth.uid() = vendor_id);
CREATE POLICY "Super admins can update canteen approval" ON public.canteens FOR UPDATE USING (has_super_admin_role(auth.uid())) WITH CHECK (has_super_admin_role(auth.uid()));

-- categories
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Vendors can manage categories of their canteen" ON public.categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = categories.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can update categories of their canteen" ON public.categories FOR UPDATE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = categories.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can delete categories of their canteen" ON public.categories FOR DELETE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = categories.canteen_id AND canteens.vendor_id = auth.uid()));

-- menu_items
CREATE POLICY "Anyone can view available menu items" ON public.menu_items FOR SELECT USING (true);
CREATE POLICY "Vendors can manage menu items of their canteen" ON public.menu_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = menu_items.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can update menu items of their canteen" ON public.menu_items FOR UPDATE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = menu_items.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can delete menu items of their canteen" ON public.menu_items FOR DELETE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = menu_items.canteen_id AND canteens.vendor_id = auth.uid()));

-- orders
CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all orders" ON public.orders FOR SELECT USING (has_super_admin_role(auth.uid()));
CREATE POLICY "Vendors can view orders for their canteen" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = orders.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Users can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own orders" ON public.orders FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Vendors can update order status" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = orders.canteen_id AND canteens.vendor_id = auth.uid()));

-- order_items
CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Super admins can view all order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND has_super_admin_role(auth.uid())));
CREATE POLICY "Vendors can view order items for their canteen" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders JOIN canteens ON canteens.id = orders.canteen_id WHERE orders.id = order_items.order_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Users can create order items" ON public.order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Users can delete their own order items" ON public.order_items FOR DELETE USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- shops
CREATE POLICY "Anyone can view approved shops" ON public.shops FOR SELECT USING (approval_status = 'approved' OR auth.uid() = owner_id OR has_super_admin_role(auth.uid()));
CREATE POLICY "Owners can create their own shop" ON public.shops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own shop" ON public.shops FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their own shop" ON public.shops FOR DELETE USING (auth.uid() = owner_id);
CREATE POLICY "Super admins can update shop approval" ON public.shops FOR UPDATE USING (has_super_admin_role(auth.uid())) WITH CHECK (has_super_admin_role(auth.uid()));

-- shop_images
CREATE POLICY "Anyone can view shop images" ON public.shop_images FOR SELECT USING (true);
CREATE POLICY "Shop owners can insert images" ON public.shop_images FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_images.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Shop owners can update images" ON public.shop_images FOR UPDATE USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_images.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Shop owners can delete images" ON public.shop_images FOR DELETE USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_images.shop_id AND shops.owner_id = auth.uid()));

-- shop_menu_items
CREATE POLICY "Anyone can view shop menu items" ON public.shop_menu_items FOR SELECT USING (true);
CREATE POLICY "Shop owners can insert menu items" ON public.shop_menu_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_menu_items.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Shop owners can update menu items" ON public.shop_menu_items FOR UPDATE USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_menu_items.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Shop owners can delete menu items" ON public.shop_menu_items FOR DELETE USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_menu_items.shop_id AND shops.owner_id = auth.uid()));

-- shop_orders
CREATE POLICY "Users can view their own shop orders" ON public.shop_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Shop owners can view orders for their shop" ON public.shop_orders FOR SELECT USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_orders.shop_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Users can create shop orders" ON public.shop_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Shop owners can update order status" ON public.shop_orders FOR UPDATE USING (EXISTS (SELECT 1 FROM shops WHERE shops.id = shop_orders.shop_id AND shops.owner_id = auth.uid()));

-- shop_order_items
CREATE POLICY "Users can view their own shop order items" ON public.shop_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND shop_orders.user_id = auth.uid()));
CREATE POLICY "Shop owners can view order items for their shop" ON public.shop_order_items FOR SELECT USING (EXISTS (SELECT 1 FROM shop_orders JOIN shops ON shops.id = shop_orders.shop_id WHERE shop_orders.id = shop_order_items.order_id AND shops.owner_id = auth.uid()));
CREATE POLICY "Users can create shop order items" ON public.shop_order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND shop_orders.user_id = auth.uid()));

-- college_config
CREATE POLICY "Anyone can view active college config" ON public.college_config FOR SELECT USING (is_active = true);
CREATE POLICY "Super admins can manage college config" ON public.college_config FOR ALL USING (has_super_admin_role(auth.uid()));

-- user_roles
CREATE POLICY "Super admins can view user_roles" ON public.user_roles FOR SELECT USING (has_super_admin_role(auth.uid()));

-- bans
CREATE POLICY "Super admins can manage bans" ON public.bans FOR ALL USING (has_super_admin_role(auth.uid()));
CREATE POLICY "Users can check their own ban status" ON public.bans FOR SELECT USING (target_id = auth.uid() AND target_type = 'student');

-- coupons
CREATE POLICY "Anyone can view active coupons by canteen" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Vendors can view coupons for their canteen" ON public.coupons FOR SELECT USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can create coupons for their canteen" ON public.coupons FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can update coupons for their canteen" ON public.coupons FOR UPDATE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can delete coupons for their canteen" ON public.coupons FOR DELETE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = coupons.canteen_id AND canteens.vendor_id = auth.uid()));

-- crown_balances
CREATE POLICY "Users can view their own crown balance" ON public.crown_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert crown balance" ON public.crown_balances FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update crown balance" ON public.crown_balances FOR UPDATE USING (auth.uid() = user_id);

-- crown_rewards
CREATE POLICY "Anyone can view active crown rewards" ON public.crown_rewards FOR SELECT USING (is_active = true);

-- crown_transactions
CREATE POLICY "Users can view their own crown transactions" ON public.crown_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own crown transactions" ON public.crown_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- redeemed_rewards
CREATE POLICY "Users can view their own redeemed rewards" ON public.redeemed_rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own redeemed rewards" ON public.redeemed_rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own redeemed rewards" ON public.redeemed_rewards FOR UPDATE USING (auth.uid() = user_id);

-- daily_stock
CREATE POLICY "Anyone can view daily stock" ON public.daily_stock FOR SELECT USING (true);
CREATE POLICY "Vendors can insert daily stock for their canteen" ON public.daily_stock FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = daily_stock.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can update daily stock for their canteen" ON public.daily_stock FOR UPDATE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = daily_stock.canteen_id AND canteens.vendor_id = auth.uid()));
CREATE POLICY "Vendors can delete daily stock for their canteen" ON public.daily_stock FOR DELETE USING (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = daily_stock.canteen_id AND canteens.vendor_id = auth.uid()));

-- notification_queue
CREATE POLICY "Service role only" ON public.notification_queue FOR ALL USING (false);

-- fcm_tokens
CREATE POLICY "Service role can read all tokens" ON public.fcm_tokens FOR SELECT USING (true);
CREATE POLICY "Users can view their own FCM tokens" ON public.fcm_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own FCM tokens" ON public.fcm_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own FCM tokens" ON public.fcm_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own FCM tokens" ON public.fcm_tokens FOR DELETE USING (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "Users can view their own push subscriptions" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own push subscriptions" ON public.push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own push subscriptions" ON public.push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- email_notifications_sent
CREATE POLICY "Service role only ens" ON public.email_notifications_sent FOR ALL USING (false);

-- shop_email_notifications_sent
CREATE POLICY "Service role only sens" ON public.shop_email_notifications_sent FOR ALL USING (false);

-- order_rejection_notifications
CREATE POLICY "Users can view their own rejection notifications" ON public.order_rejection_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can dismiss their own rejection notifications" ON public.order_rejection_notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Vendors can insert rejection notifications for their canteen" ON public.order_rejection_notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM canteens WHERE canteens.id = order_rejection_notifications.canteen_id AND canteens.vendor_id = auth.uid()));

-- telegram_pending_links
CREATE POLICY "Users can view their own pending links" ON public.telegram_pending_links FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own pending links" ON public.telegram_pending_links FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pending links" ON public.telegram_pending_links FOR DELETE USING (auth.uid() = user_id);

-- telegram_notifications_sent
CREATE POLICY "Service role only for telegram notifications" ON public.telegram_notifications_sent FOR ALL USING (false);

-- telegram_polling_state
CREATE POLICY "Service role only for polling state" ON public.telegram_polling_state FOR ALL USING (false);

-- ============================================================
-- 7. STORAGE
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public read menu images" ON storage.objects FOR SELECT USING (bucket_id = 'menu-images');
CREATE POLICY "Authenticated users can upload menu images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their menu images" ON storage.objects FOR UPDATE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their menu images" ON storage.objects FOR DELETE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- ============================================================
-- 8. SEED DATA
-- ============================================================

-- NOTE: Profiles are created automatically via auth trigger.
-- You must re-create users via Supabase Auth (signups) first.
-- The INSERT statements below are for reference data only.
-- Run these AFTER creating auth users with matching IDs.

-- college_config
INSERT INTO public.college_config (id, name, latitude, longitude, campus_radius_meters, is_active, show_nearby_shops) VALUES
  ('01ffbecb-57ba-4d38-b906-af55f28deadc', 'ABES ENGINEERING COLLEGE', 28.6366, 77.4455, 1000, true, false),
  ('2a6aaf69-7d97-4c6d-9eff-7c35759b9628', 'ABES Engineering College', 28.6366, 77.4455, 600, true, false)
ON CONFLICT (id) DO NOTHING;

-- user_roles (super admin)
-- You must first create the user via auth, then insert the role:
-- INSERT INTO public.user_roles (id, user_id, role) VALUES ('1040c1b9-7df0-47d0-b9ca-5eeb6793d3de', '<YOUR_ADMIN_USER_ID>', 'super_admin');

-- crown_rewards
INSERT INTO public.crown_rewards (id, name, description, reward_type, crowns_required, discount_value, is_active) VALUES
  ('68afafab-075c-4883-a499-dd6ee727b420', 'Bronze Discount', 'Get ₹25 off on your next order', 'discount', 50, 25, true),
  ('b0fd6904-988f-44f4-86e1-91c1b5634922', 'Silver Discount', 'Get ₹60 off on your next order', 'discount', 100, 60, true),
  ('c200ee91-2012-435f-a277-0481f63d30c4', 'Gold Free Item', 'Redeem a free item worth up to ₹50', 'free_item', 200, 50, true)
ON CONFLICT (id) DO NOTHING;

-- telegram_polling_state
INSERT INTO public.telegram_polling_state (id, last_update_id) VALUES
  ('eff02231-0112-4dbf-9963-e4290c376236', 335495638)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- IMPORTANT NOTES FOR MIGRATION
-- ============================================================
-- 1. Create auth users FIRST via Supabase Auth dashboard or API
--    The handle_new_user trigger will auto-create profiles
-- 2. For canteens/shops with image_url pointing to the OLD Supabase
--    storage URL, you'll need to re-upload images and update URLs
-- 3. Set your edge function secrets (CASHFREE_APP_ID, CASHFREE_SECRET_KEY,
--    BREVO_API_KEY, etc.) in the new project's vault
-- 4. Orders and order_items contain payment data - import carefully
-- 5. The super admin user_roles entry needs the new user's UUID
-- ============================================================
