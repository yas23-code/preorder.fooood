-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to poll Telegram updates every 10 seconds
-- Note: pg_cron minimum interval is 1 minute, so we'll use pg_net for HTTP calls
SELECT cron.schedule(
  'telegram-poll-updates',
  '* * * * *', -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://knhnzzkyctskkgqfprsz.supabase.co/functions/v1/telegram-poll-updates',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaG56emt5Y3Rza2tncWZwcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDM2MzgsImV4cCI6MjA4MTgxOTYzOH0.eZ3pydT21fmJXuKLiHAPKshn-mVkZDrYwMynyuRb1j8"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);