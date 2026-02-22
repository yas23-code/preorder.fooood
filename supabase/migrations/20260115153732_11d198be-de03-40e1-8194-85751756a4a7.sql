-- Create table for FCM tokens
CREATE TABLE public.fcm_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable Row Level Security
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own FCM tokens" 
ON public.fcm_tokens 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own FCM tokens" 
ON public.fcm_tokens 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FCM tokens" 
ON public.fcm_tokens 
FOR DELETE 
USING (auth.uid() = user_id);

-- Allow service role to read all tokens (for sending notifications)
CREATE POLICY "Service role can read all tokens"
ON public.fcm_tokens
FOR SELECT
TO service_role
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_fcm_tokens_user_id ON public.fcm_tokens(user_id);