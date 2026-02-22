-- Add 'rejected' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'rejected';

-- Create order rejection notifications table for student banners
CREATE TABLE IF NOT EXISTS public.order_rejection_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  canteen_id uuid NOT NULL REFERENCES canteens(id) ON DELETE CASCADE,
  canteen_name text NOT NULL,
  rejection_reason text,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_rejection_notifications ENABLE ROW LEVEL SECURITY;

-- Students can view their own rejection notifications
CREATE POLICY "Users can view their own rejection notifications"
ON public.order_rejection_notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Students can update (dismiss) their own rejection notifications
CREATE POLICY "Users can dismiss their own rejection notifications"
ON public.order_rejection_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert rejection notifications (vendors via their canteen)
CREATE POLICY "Vendors can insert rejection notifications for their canteen orders"
ON public.order_rejection_notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM canteens
    WHERE canteens.id = order_rejection_notifications.canteen_id
    AND canteens.vendor_id = auth.uid()
  )
);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_rejection_notifications;