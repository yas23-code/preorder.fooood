-- Create table to track shop email notifications sent (prevent duplicates)
CREATE TABLE public.shop_email_notifications_sent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL UNIQUE,
  user_id UUID NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent'
);

-- Enable RLS
ALTER TABLE public.shop_email_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Service role only policy (edge functions use service role)
CREATE POLICY "Service role only" 
ON public.shop_email_notifications_sent 
FOR ALL 
USING (false);

-- Add foreign key reference to shop_orders
ALTER TABLE public.shop_email_notifications_sent 
ADD CONSTRAINT shop_email_notifications_sent_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES public.shop_orders(id) ON DELETE CASCADE;