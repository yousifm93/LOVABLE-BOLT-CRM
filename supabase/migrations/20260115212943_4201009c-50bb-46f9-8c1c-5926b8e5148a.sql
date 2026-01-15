-- Add job_title column to email_contact_suggestions table
ALTER TABLE email_contact_suggestions ADD COLUMN IF NOT EXISTS job_title TEXT;