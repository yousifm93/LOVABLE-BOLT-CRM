-- Add user_notes column to email_logs for manual notes about email suggestions
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS user_notes TEXT;

-- Add confidence column to email_field_suggestions
ALTER TABLE email_field_suggestions ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);