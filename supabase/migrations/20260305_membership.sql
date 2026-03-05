-- =============================================================
-- Campus Membership System
-- =============================================================

-- 1. Create memberships table
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  membership_status TEXT NOT NULL DEFAULT 'INACTIVE' CHECK (membership_status IN ('ACTIVE', 'INACTIVE')),
  membership_purchase_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Add membership_discount column to canteens (vendor-configurable)
ALTER TABLE public.canteens ADD COLUMN IF NOT EXISTS membership_discount NUMERIC DEFAULT 5;

-- 3. Enable RLS on memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can read own membership"
  ON public.memberships FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own membership"
  ON public.memberships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own membership"
  ON public.memberships FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow vendors to read memberships (for dashboard stats)
CREATE POLICY "Vendors can read all memberships"
  ON public.memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'vendor'
    )
  );

-- 5. Function to check if membership is active (has order >= 70 in last 3 days)
CREATE OR REPLACE FUNCTION public.check_membership_activity(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.orders
    WHERE user_id = p_user_id
      AND total >= 70
      AND status = 'completed'
      AND payment_status = 'paid'
      AND created_at >= NOW() - INTERVAL '3 days'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get days until membership deactivates
CREATE OR REPLACE FUNCTION public.get_membership_days_remaining(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  last_qualifying_order TIMESTAMP WITH TIME ZONE;
  days_left INTEGER;
BEGIN
  SELECT MAX(created_at) INTO last_qualifying_order
  FROM public.orders
  WHERE user_id = p_user_id
    AND total >= 70
    AND status = 'completed'
    AND payment_status = 'paid'
    AND created_at >= NOW() - INTERVAL '3 days';

  IF last_qualifying_order IS NULL THEN
    RETURN 0;
  END IF;

  days_left := EXTRACT(DAY FROM (last_qualifying_order + INTERVAL '3 days' - NOW()))::INTEGER;
  RETURN GREATEST(days_left, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Activate membership function (called after payment)
CREATE OR REPLACE FUNCTION public.activate_membership(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.memberships (user_id, membership_status, membership_purchase_date)
  VALUES (p_user_id, 'ACTIVE', NOW())
  ON CONFLICT (user_id)
  DO UPDATE SET
    membership_status = 'ACTIVE',
    membership_purchase_date = COALESCE(public.memberships.membership_purchase_date, NOW()),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
