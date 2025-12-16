-- Allow NULL lead_id in email_logs table for lender marketing emails
ALTER TABLE email_logs ALTER COLUMN lead_id DROP NOT NULL;