-- Create storage bucket for menu item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true);

-- Allow anyone to view menu images
CREATE POLICY "Menu images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'menu-images');

-- Allow authenticated vendors to upload menu images
CREATE POLICY "Vendors can upload menu images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- Allow vendors to update their menu images
CREATE POLICY "Vendors can update menu images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);

-- Allow vendors to delete menu images
CREATE POLICY "Vendors can delete menu images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'menu-images' 
  AND auth.role() = 'authenticated'
);