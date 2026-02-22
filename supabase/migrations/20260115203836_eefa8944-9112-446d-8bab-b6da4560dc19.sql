-- Create table to store Telegram polling state
CREATE TABLE IF NOT EXISTS public.telegram_polling_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  last_update_id bigint NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial state
INSERT INTO public.telegram_polling_state (last_update_id) VALUES (0);

-- RLS for service role only
ALTER TABLE public.telegram_polling_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only for polling state"
  ON public.telegram_polling_state
  FOR ALL
  USING (false);