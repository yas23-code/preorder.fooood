-- Add vendor_email column to canteens table
ALTER TABLE public.canteens 
ADD COLUMN vendor_email text;

-- Add a comment for documentation
COMMENT ON COLUMN public.canteens.vendor_email IS 'Email address for vendor notifications specific to this canteen';