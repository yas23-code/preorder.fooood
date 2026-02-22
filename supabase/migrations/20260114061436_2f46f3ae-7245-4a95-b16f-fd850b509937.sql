-- Create a function that will be called when order status changes
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  canteen_name text;
  notification_title text;
  notification_message text;
BEGIN
  -- Only proceed if status changed to 'ready' or 'completed'
  IF NEW.status IN ('ready', 'completed') AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
    -- Get canteen name
    SELECT name INTO canteen_name FROM public.canteens WHERE id = NEW.canteen_id;
    
    -- Build notification content
    IF NEW.status = 'ready' THEN
      notification_title := 'Order Ready for Pickup! 🎉';
      notification_message := 'Your order from ' || COALESCE(canteen_name, 'the canteen') || ' is ready. Pickup code: ' || COALESCE(NEW.pickup_code, 'N/A');
    ELSE
      notification_title := 'Order Completed ✅';
      notification_message := 'Your order from ' || COALESCE(canteen_name, 'the canteen') || ' has been completed. Thank you!';
    END IF;
    
    -- Call edge function via pg_net extension (if available) or log for webhook
    -- For now, we'll use a webhook approach via Supabase Database Webhooks
    -- Insert into a notification queue table for the edge function to process
    INSERT INTO public.notification_queue (user_id, title, message, order_id, created_at)
    VALUES (NEW.user_id, notification_title, notification_message, NEW.id, now());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create notification queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Only allow service role to access this table
CREATE POLICY "Service role only" ON public.notification_queue
  FOR ALL USING (false);

-- Create trigger on orders table
DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_order_status_change();

-- Enable realtime for notification_queue so edge function can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;