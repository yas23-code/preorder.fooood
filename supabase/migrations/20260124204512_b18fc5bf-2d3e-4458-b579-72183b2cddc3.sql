-- Set replica identity to FULL to capture OLD values in realtime updates
ALTER TABLE public.shop_orders REPLICA IDENTITY FULL;