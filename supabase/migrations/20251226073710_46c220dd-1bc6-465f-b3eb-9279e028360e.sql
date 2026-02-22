-- Set REPLICA IDENTITY to FULL to get complete row data in updates (needed for old values)
ALTER TABLE public.orders REPLICA IDENTITY FULL;