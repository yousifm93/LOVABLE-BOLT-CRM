-- Add description and email_log_id columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_log_id UUID REFERENCES email_logs(id);