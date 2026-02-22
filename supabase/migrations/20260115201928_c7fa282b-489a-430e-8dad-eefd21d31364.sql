-- Add telegram_chat_id to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS telegram_chat_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id 
ON public.profiles(telegram_chat_id) 
WHERE telegram_chat_id IS NOT NULL;

-- Create table to track sent telegram notifications (prevent duplicates)
CREATE TABLE IF NOT EXISTS public.telegram_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  message_id text
);

-- Enable RLS
ALTER TABLE public.telegram_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only for telegram notifications"
ON public.telegram_notifications_sent
FOR ALL
USING (false);

-- Create table to store pending telegram links (for connecting users)
CREATE TABLE IF NOT EXISTS public.telegram_pending_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  link_code text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '15 minutes')
);

-- Enable RLS
ALTER TABLE public.telegram_pending_links ENABLE ROW LEVEL SECURITY;

-- Users can create their own pending links
CREATE POLICY "Users can create their own pending links"
ON public.telegram_pending_links
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own pending links
CREATE POLICY "Users can view their own pending links"
ON public.telegram_pending_links
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own pending links
CREATE POLICY "Users can delete their own pending links"
ON public.telegram_pending_links
FOR DELETE
USING (auth.uid() = user_id);