-- Ensure super admins can read all records for reporting purposes

-- Memberships
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'memberships' AND policyname = 'Super admins can read all memberships'
  ) THEN
    CREATE POLICY "Super admins can read all memberships"
      ON public.memberships FOR SELECT
      USING (public.has_super_admin_role(auth.uid()));
  END IF;
END $$;

-- Orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Super admins can read all orders'
  ) THEN
    CREATE POLICY "Super admins can read all orders"
      ON public.orders FOR SELECT
      USING (public.has_super_admin_role(auth.uid()));
  END IF;
END $$;

-- Shop Orders
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'shop_orders' AND policyname = 'Super admins can read all shop orders'
  ) THEN
    CREATE POLICY "Super admins can read all shop orders"
      ON public.shop_orders FOR SELECT
      USING (public.has_super_admin_role(auth.uid()));
  END IF;
END $$;

-- Also ensure the admin email is assigned the super_admin role in user_roles table
-- This is critical because SQL policies use has_super_admin_role() which checks this table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'preorderfood2026@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
