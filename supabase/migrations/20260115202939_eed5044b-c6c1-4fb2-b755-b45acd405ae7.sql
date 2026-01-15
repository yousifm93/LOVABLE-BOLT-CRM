-- Add company and suggested_tags columns to email_contact_suggestions
ALTER TABLE email_contact_suggestions 
ADD COLUMN IF NOT EXISTS company TEXT,
ADD COLUMN IF NOT EXISTS suggested_tags TEXT[];