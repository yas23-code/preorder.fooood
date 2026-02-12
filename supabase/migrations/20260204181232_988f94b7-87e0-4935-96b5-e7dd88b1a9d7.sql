-- Add show_nearby_shops column to college_config table
ALTER TABLE public.college_config
ADD COLUMN show_nearby_shops boolean NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.college_config.show_nearby_shops IS 'When false, only college canteens are shown to students, hiding nearby shops';