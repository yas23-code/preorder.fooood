-- Create app_role enum for super admin (separate from existing user_role)
CREATE TYPE public.super_admin_role AS ENUM ('super_admin');

-- Create user_roles table for super admin access (separate from profiles.role)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role super_admin_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has super admin role
CREATE OR REPLACE FUNCTION public.has_super_admin_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- RLS policy: Only super admins can view user_roles
CREATE POLICY "Super admins can view user_roles"
ON public.user_roles
FOR SELECT
USING (public.has_super_admin_role(auth.uid()));

-- Create bans table for tracking banned users/canteens
CREATE TABLE public.bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('student', 'canteen')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('temporary', 'permanent')),
  expires_at TIMESTAMP WITH TIME ZONE,
  banned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS on bans
ALTER TABLE public.bans ENABLE ROW LEVEL SECURITY;

-- RLS policies for bans table
CREATE POLICY "Super admins can manage bans"
ON public.bans
FOR ALL
USING (public.has_super_admin_role(auth.uid()));

CREATE POLICY "Users can check their own ban status"
ON public.bans
FOR SELECT
USING (target_id = auth.uid() AND target_type = 'student');

-- Function to check if a user/canteen is banned
CREATE OR REPLACE FUNCTION public.is_banned(_target_id UUID, _target_type TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bans
    WHERE target_id = _target_id
      AND target_type = _target_type
      AND is_active = true
      AND (ban_type = 'permanent' OR (ban_type = 'temporary' AND expires_at > now()))
  )
$$;

-- Add phone column to profiles if not exists (for search)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;