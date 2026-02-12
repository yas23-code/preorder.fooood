-- Enable realtime for canteens table only (orders already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.canteens;