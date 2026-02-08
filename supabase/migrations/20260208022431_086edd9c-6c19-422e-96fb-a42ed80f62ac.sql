-- Schedule cleanup of stale pending deposits every 5 minutes
SELECT cron.schedule(
  'cleanup-stale-deposits',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://ucfjjcccgoxnfjaqfmws.supabase.co/functions/v1/cleanup-stale-deposits',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjZmpqY2NjZ294bmZqYXFmbXdzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg4MzAwNDIsImV4cCI6MjA4NDQwNjA0Mn0.4buo5k5Mp-baUGUkOcAIgbgpL3m5IbUD68O_pfWzxCg", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);