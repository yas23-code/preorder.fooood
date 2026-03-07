-- =============================================================
-- Membership Discount Start Time
-- Allows vendors to restrict when the campus member discount
-- is applicable (e.g., only after 5:00 PM).
-- =============================================================

-- Add membership_discount_start_time column to canteens table.
-- Stored as TIME (HH:MM:SS) in IST.
-- NULL means the discount is always applicable (no time restriction).
ALTER TABLE public.canteens
  ADD COLUMN IF NOT EXISTS membership_discount_start_time TIME DEFAULT NULL;
