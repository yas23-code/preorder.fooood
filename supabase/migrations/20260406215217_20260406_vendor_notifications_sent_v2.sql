-- Create table to track sent vendor notifications (prevent duplicates)
CREATE TABLE IF NOT EXISTS public.vendor_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create table to track sent shop vendor notifications (prevent duplicates)
CREATE TABLE IF NOT EXISTS public.shop_vendor_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL UNIQUE REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  sent_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendor_notifications_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_vendor_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Only service role can access these tables
CREATE POLICY "Service role only for vendor notifications"
ON public.vendor_notifications_sent
FOR ALL
USING (false);

CREATE POLICY "Service role only for shop vendor notifications"
ON public.shop_vendor_notifications_sent
FOR ALL
USING (false);
