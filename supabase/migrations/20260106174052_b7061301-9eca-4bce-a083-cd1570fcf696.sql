-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create the cron job to run create-recurring-tasks at 6:00 AM EST (11:00 AM UTC) daily
SELECT cron.schedule(
  'create-recurring-tasks-daily',
  '0 11 * * *',  -- 11:00 AM UTC = 6:00 AM EST
  $$
  SELECT
    net.http_post(
      url := 'https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/create-recurring-tasks',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Grant usage to service role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;