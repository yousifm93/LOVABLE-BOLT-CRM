-- Make user_id optional in activity log tables to allow logging by any authenticated user
ALTER TABLE call_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE sms_logs ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE email_logs ALTER COLUMN user_id DROP NOT NULL;