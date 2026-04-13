-- Add is_abes_verified column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_abes_verified BOOLEAN DEFAULT FALSE;

-- Create college_verifications table
CREATE TABLE IF NOT EXISTS public.college_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '10 minutes'),
  verified_at TIMESTAMPTZ
);

-- RLS for college_verifications
ALTER TABLE public.college_verifications ENABLE ROW LEVEL SECURITY;

-- If policy exists, drop it first to avoid error
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can only see their own verifications' AND tablename = 'college_verifications') THEN
        DROP POLICY "Users can only see their own verifications" ON public.college_verifications;
    END IF;
END $$;

CREATE POLICY "Users can only see their own verifications" ON public.college_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Only allow authenticated users to initiate verification (handled by Edge Function, but good to have)
-- However, since the edge function uses service role, it bypasses RLS anyway.
