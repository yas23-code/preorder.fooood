ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS is_abes_student BOOLEAN DEFAULT NULL;

-- Update RLS policies (usually profiles are viewable by self/public)
-- Assuming existing policies cover new columns if they are not explicitly restricted.
