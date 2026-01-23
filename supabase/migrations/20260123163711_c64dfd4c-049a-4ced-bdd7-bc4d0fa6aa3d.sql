
-- Create cron job to check for overdue conditions every day at 6 AM EST (11 AM UTC)
SELECT cron.schedule(
  'check-overdue-conditions-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/check-overdue-conditions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
