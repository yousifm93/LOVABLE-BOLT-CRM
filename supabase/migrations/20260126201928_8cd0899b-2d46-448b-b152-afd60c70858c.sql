-- Clear existing rate-related cron jobs
SELECT cron.unschedule('refresh-15yr-fixed-daily');
SELECT cron.unschedule('refresh-fha-30yr-daily');

-- Schedule 16 rate scenarios (30 minutes apart, starting midnight ET = 5:00 UTC)
-- 15-Year Fixed scenarios
SELECT cron.schedule(
  'rate-15yr-fixed-80ltv',
  '0 5 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "15yr_fixed"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-15yr-fixed-90ltv',
  '30 5 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "15yr_fixed_90ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-15yr-fixed-95ltv',
  '0 6 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "15yr_fixed_95ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-15yr-fixed-97ltv',
  '30 6 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "15yr_fixed_97ltv"}'::jsonb
  ) AS request_id;$$
);

-- 30-Year Fixed scenarios
SELECT cron.schedule(
  'rate-30yr-fixed-70ltv',
  '0 7 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "30yr_fixed_70ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-30yr-fixed-80ltv',
  '30 7 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "30yr_fixed"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-30yr-fixed-95ltv',
  '0 8 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "30yr_fixed_95ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-30yr-fixed-97ltv',
  '30 8 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "30yr_fixed_97ltv"}'::jsonb
  ) AS request_id;$$
);

-- FHA 30-Year scenario
SELECT cron.schedule(
  'rate-fha-30yr-965ltv',
  '0 9 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "fha_30yr_965ltv"}'::jsonb
  ) AS request_id;$$
);

-- Bank Statement scenarios
SELECT cron.schedule(
  'rate-bank-stmt-70ltv',
  '30 9 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "bank_statement_70ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-bank-stmt-80ltv',
  '0 10 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "bank_statement"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-bank-stmt-85ltv',
  '30 10 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "bank_statement_85ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-bank-stmt-90ltv',
  '0 11 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "bank_statement_90ltv"}'::jsonb
  ) AS request_id;$$
);

-- DSCR scenarios
SELECT cron.schedule(
  'rate-dscr-70ltv',
  '30 11 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "dscr_70ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-dscr-75ltv',
  '0 12 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "dscr_75ltv"}'::jsonb
  ) AS request_id;$$
);

SELECT cron.schedule(
  'rate-dscr-80ltv',
  '30 12 * * *',
  $$SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/fetch-single-rate',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc3ZhdG9ueGFreXNuYnFuZmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTg2NTAsImV4cCI6MjA3MDY5NDY1MH0.CcjsfGGYq43oN13uK8a9LAfAaytnHm4FNqJWe3n_ZoQ"}'::jsonb,
    body:='{"scenario_type": "dscr"}'::jsonb
  ) AS request_id;$$
);