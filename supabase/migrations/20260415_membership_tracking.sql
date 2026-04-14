-- =============================================================
-- Update Memberships for detailed revenue tracking
-- =============================================================

-- 1. Add columns to memberships table
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0;
ALTER TABLE public.memberships ADD COLUMN IF NOT EXISTS remaining_free_packings INTEGER DEFAULT 0;

-- 2. Update activate_membership function to support plan info
CREATE OR REPLACE FUNCTION public.activate_membership(
  p_user_id UUID,
  p_plan_type TEXT DEFAULT NULL,
  p_amount_paid NUMERIC DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_free_packings INTEGER := 0;
BEGIN
  -- Determine free packing count based on plan
  IF p_plan_type = 'BASIC' OR p_plan_type = 'basic' THEN
    v_free_packings := 3;
  ELSIF p_plan_type = 'PRO' OR p_plan_type = 'pro' THEN
    v_free_packings := 5;
  END IF;

  INSERT INTO public.memberships (user_id, membership_status, membership_purchase_date, plan_type, amount_paid, remaining_free_packings)
  VALUES (p_user_id, 'ACTIVE', NOW(), p_plan_type, p_amount_paid, v_free_packings)
  ON CONFLICT (user_id)
  DO UPDATE SET
    membership_status = 'ACTIVE',
    membership_purchase_date = NOW(),
    plan_type = p_plan_type,
    amount_paid = COALESCE(p_amount_paid, public.memberships.amount_paid),
    remaining_free_packings = v_free_packings,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
