-- Enable the pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a cron job to process the notification queue every minute
SELECT cron.schedule(
  'process-notification-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://knhnzzkyctskkgqfprsz.supabase.co/functions/v1/process-notification-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuaG56emt5Y3Rza2tncWZwcnN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNDM2MzgsImV4cCI6MjA4MTgxOTYzOH0.eZ3pydT21fmJXuKLiHAPKshn-mVkZDrYwMynyuRb1j8'
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);