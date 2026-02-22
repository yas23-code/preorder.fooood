-- Create table to track sent email notifications (prevent duplicates)
CREATE TABLE IF NOT EXISTS public.email_notifications_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent',
  UNIQUE(order_id)
);

-- Enable RLS
ALTER TABLE public.email_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Only service role can access this table
CREATE POLICY "Service role only" ON public.email_notifications_sent
  FOR ALL USING (false);

-- Create index for faster lookups
CREATE INDEX idx_email_notifications_sent_order_id ON public.email_notifications_sent(order_id);