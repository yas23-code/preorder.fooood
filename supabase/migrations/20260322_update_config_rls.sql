-- Drop the restrictive policy
DROP POLICY IF EXISTS "Anyone can view active college config" ON public.college_config;

-- Create a new policy that allows viewing of inactive configs too
CREATE POLICY "Anyone can view college config"
ON public.college_config
FOR SELECT
USING (true);
