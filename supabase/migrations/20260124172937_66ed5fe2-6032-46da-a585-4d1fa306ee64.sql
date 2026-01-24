-- Enable pg_cron and pg_net extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the auto-cancel function to run every minute
SELECT cron.schedule(
  'auto-cancel-stale-rooms',
  '* * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://ucfjjcccgoxnfjaqfmws.supabase.co/functions/v1/auto-cancel-stale-rooms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZmpqY2NjZ294bmZqYXFmbXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzAwNDIsImV4cCI6MjA4NDQwNjA0Mn0.4buo5k5Mp-baUGUkOcAIgbgpL3m5IbUD68O_pfWzxCg"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);