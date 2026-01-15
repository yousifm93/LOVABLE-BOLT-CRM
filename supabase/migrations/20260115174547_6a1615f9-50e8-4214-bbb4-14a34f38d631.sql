-- Add source_type column to contacts table for tracking email imports
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';

-- Update email_contact_suggestions table (it already exists, but ensure all columns are present)
-- Add reason column if missing
ALTER TABLE public.email_contact_suggestions 
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC;

-- Add From Emails source type index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_contacts_source_type ON public.contacts(source_type);

-- Add index on email_contact_suggestions for pending status
CREATE INDEX IF NOT EXISTS idx_email_contact_suggestions_status ON public.email_contact_suggestions(status);

-- Add index for email_log_id lookups
CREATE INDEX IF NOT EXISTS idx_email_contact_suggestions_email_log ON public.email_contact_suggestions(email_log_id);