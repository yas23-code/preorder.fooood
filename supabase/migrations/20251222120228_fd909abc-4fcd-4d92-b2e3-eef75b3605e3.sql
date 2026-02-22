-- Add is_open column to canteens table
ALTER TABLE public.canteens 
ADD COLUMN is_open boolean NOT NULL DEFAULT true;