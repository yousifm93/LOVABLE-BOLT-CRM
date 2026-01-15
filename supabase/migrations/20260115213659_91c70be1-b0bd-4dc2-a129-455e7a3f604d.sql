-- Add approval_status column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'approved';

-- Set all existing email-imported contacts to approved (they were manually approved before)
UPDATE contacts SET approval_status = 'approved' WHERE source_type = 'email_import' AND approval_status IS NULL;