-- Add approval_status column to shops table
ALTER TABLE public.shops 
ADD COLUMN approval_status text NOT NULL DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Create index for efficient filtering
CREATE INDEX idx_shops_approval_status ON public.shops(approval_status);

-- Update RLS policy for shops - only show approved shops to public (except owners and super admins)
DROP POLICY IF EXISTS "Anyone can view shops" ON public.shops;

CREATE POLICY "Anyone can view approved shops" 
ON public.shops 
FOR SELECT 
USING (
  approval_status = 'approved' 
  OR auth.uid() = owner_id 
  OR has_super_admin_role(auth.uid())
);

-- Super admins can update approval status
CREATE POLICY "Super admins can update shop approval" 
ON public.shops 
FOR UPDATE 
USING (has_super_admin_role(auth.uid()))
WITH CHECK (has_super_admin_role(auth.uid()));