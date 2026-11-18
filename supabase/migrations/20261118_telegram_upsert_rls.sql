-- Add UPDATE policy for telegram_pending_links (required for UPSERT / ON CONFLICT DO UPDATE)
CREATE POLICY IF NOT EXISTS "Users can update their own pending links"
ON public.telegram_pending_links
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
