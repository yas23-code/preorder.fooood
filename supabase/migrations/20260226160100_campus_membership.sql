-- Add membership fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'INACTIVE',
ADD COLUMN IF NOT EXISTS membership_purchase_date timestamptz;

-- Add discount fields to canteens
ALTER TABLE public.canteens
ADD COLUMN IF NOT EXISTS member_discount_value numeric DEFAULT 0;

-- Function to check if a user is eligible for member discount
CREATE OR REPLACE FUNCTION public.is_member_eligible(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
    v_status text;
    v_purchase_date timestamptz;
    v_recent_order_exists boolean;
BEGIN
    -- Get user membership info
    SELECT membership_status, membership_purchase_date INTO v_status, v_purchase_date
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_status != 'ACTIVE' THEN
        RETURN false;
    END IF;

    -- Check for order >= 70 in the last 3 days
    -- We check if there's any completed order with total >= 70
    SELECT EXISTS (
        SELECT 1 FROM public.orders
        WHERE user_id = p_user_id
        AND total >= 70
        AND status IN ('completed', 'ready', 'accepted') -- Considering orders that are progressing or done
        AND created_at >= now() - interval '3 days'
    ) INTO v_recent_order_exists;

    RETURN v_recent_order_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
