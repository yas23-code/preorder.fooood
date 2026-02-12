-- Add approval_status column to canteens table
ALTER TABLE public.canteens 
ADD COLUMN approval_status text NOT NULL DEFAULT 'pending' 
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Create index for efficient filtering
CREATE INDEX idx_canteens_approval_status ON public.canteens(approval_status);

-- Update RLS policy for canteens - only show approved canteens to public (except vendors and super admins)
DROP POLICY IF EXISTS "Anyone can view canteens" ON public.canteens;

CREATE POLICY "Anyone can view approved canteens" 
ON public.canteens 
FOR SELECT 
USING (
  approval_status = 'approved' 
  OR auth.uid() = vendor_id 
  OR has_super_admin_role(auth.uid())
);