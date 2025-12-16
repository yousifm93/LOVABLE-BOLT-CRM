-- Add lender_marketing_data JSONB column to email_logs for storing extracted lender data
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS lender_marketing_data jsonb;