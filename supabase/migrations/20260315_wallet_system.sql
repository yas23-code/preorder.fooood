-- ============================================================
-- Wallet System Migration
-- ============================================================

-- 1. Add wallet_balance to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC NOT NULL DEFAULT 0;

-- 2. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    amount NUMERIC NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('load', 'payment', 'refund', 'bonus')),
    description TEXT,
    order_id UUID REFERENCES public.orders(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS on wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet transactions"
    ON public.wallet_transactions FOR SELECT
    USING (auth.uid() = user_id);

-- 4. RPC to pay for an order using wallet
CREATE OR REPLACE FUNCTION public.pay_with_wallet(p_order_id UUID, p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_order_total NUMERIC;
    v_current_balance NUMERIC;
BEGIN
    -- Get order total
    SELECT total INTO v_order_total FROM public.orders WHERE id = p_order_id AND user_id = p_user_id AND payment_status = 'pending';
    
    IF v_order_total IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Order not found or already paid');
    END IF;

    -- Get user balance
    SELECT wallet_balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;

    IF v_current_balance < v_order_total THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient wallet balance');
    END IF;

    -- Deduct balance
    UPDATE public.profiles SET wallet_balance = wallet_balance - v_order_total WHERE id = p_user_id;

    -- Record transaction
    INSERT INTO public.wallet_transactions (user_id, amount, type, description, order_id)
    VALUES (p_user_id, -v_order_total, 'payment', 'Payment for order ' || p_order_id, p_order_id);

    -- Mark order as paid
    UPDATE public.orders SET payment_status = 'paid', updated_at = now() WHERE id = p_order_id;

    RETURN json_build_object('success', true, 'new_balance', v_current_balance - v_order_total);
END;
$$;

-- 5. RPC to load wallet balance (Security Definer for use by Edge Functions)
CREATE OR REPLACE FUNCTION public.load_wallet_balance(p_user_id UUID, p_amount NUMERIC, p_bonus NUMERIC, p_description TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_new_balance NUMERIC;
BEGIN
    -- Update balance (base amount + bonus)
    UPDATE public.profiles 
    SET wallet_balance = wallet_balance + p_amount + p_bonus 
    WHERE id = p_user_id
    RETURNING wallet_balance INTO v_new_balance;

    -- Record load transaction
    INSERT INTO public.wallet_transactions (user_id, amount, type, description)
    VALUES (p_user_id, p_amount, 'load', p_description);

    -- Record bonus transaction if applicable
    IF p_bonus > 0 THEN
        INSERT INTO public.wallet_transactions (user_id, amount, type, description)
        VALUES (p_user_id, p_bonus, 'bonus', 'Top-up bonus');
    END IF;

    RETURN v_new_balance;
END;
$$;
