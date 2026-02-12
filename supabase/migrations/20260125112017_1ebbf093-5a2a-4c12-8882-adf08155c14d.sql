-- Add RLS policy for Super Admins to update canteen approval status
CREATE POLICY "Super admins can update canteen approval"
ON public.canteens
FOR UPDATE
USING (has_super_admin_role(auth.uid()))
WITH CHECK (has_super_admin_role(auth.uid()));