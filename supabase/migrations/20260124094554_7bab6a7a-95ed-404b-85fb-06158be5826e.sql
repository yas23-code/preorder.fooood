-- Add shop_type column to shops table
ALTER TABLE public.shops 
ADD COLUMN shop_type text NOT NULL DEFAULT 'public' 
CHECK (shop_type IN ('college', 'public'));

-- Create college_config table for storing college location and radius
CREATE TABLE public.college_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  campus_radius_meters integer NOT NULL DEFAULT 500,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on college_config
ALTER TABLE public.college_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read college config (needed for location checks)
CREATE POLICY "Anyone can view active college config"
ON public.college_config
FOR SELECT
USING (is_active = true);

-- Only super admins can manage college config
CREATE POLICY "Super admins can manage college config"
ON public.college_config
FOR ALL
USING (has_super_admin_role(auth.uid()));

-- Add trigger for updated_at on college_config
CREATE TRIGGER update_college_config_updated_at
BEFORE UPDATE ON public.college_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a default college config (can be updated later)
INSERT INTO public.college_config (name, latitude, longitude, campus_radius_meters)
VALUES ('Default College', 0, 0, 500);