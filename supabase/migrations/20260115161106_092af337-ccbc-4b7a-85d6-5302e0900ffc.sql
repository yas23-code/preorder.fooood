-- Add UPDATE policy for fcm_tokens (needed for upsert)
CREATE POLICY "Users can update their own FCM tokens"
ON public.fcm_tokens
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);