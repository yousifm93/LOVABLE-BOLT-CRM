-- Morning rate refresh cron jobs (staggered 5 minutes apart starting at 6:00 AM EST / 11:00 UTC)

-- 30 Year Fixed at 6:00 AM EST (11:00 UTC)
SELECT cron.schedule(
  'refresh-30yr-fixed-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body := '{"scenario_type": "30yr_fixed"}'::jsonb
  ) AS request_id;
  $$
);

-- 15 Year Fixed at 6:05 AM EST (11:05 UTC)
SELECT cron.schedule(
  'refresh-15yr-fixed-daily',
  '5 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body := '{"scenario_type": "15yr_fixed"}'::jsonb
  ) AS request_id;
  $$
);

-- FHA 30 Year at 6:10 AM EST (11:10 UTC)
SELECT cron.schedule(
  'refresh-fha-30yr-daily',
  '10 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body := '{"scenario_type": "fha_30yr"}'::jsonb
  ) AS request_id;
  $$
);

-- Bank Statement at 6:15 AM EST (11:15 UTC)
SELECT cron.schedule(
  'refresh-bank-statement-daily',
  '15 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body := '{"scenario_type": "bank_statement"}'::jsonb
  ) AS request_id;
  $$
);

-- DSCR at 6:20 AM EST (11:20 UTC)
SELECT cron.schedule(
  'refresh-dscr-daily',
  '20 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body := '{"scenario_type": "dscr"}'::jsonb
  ) AS request_id;
  $$
);