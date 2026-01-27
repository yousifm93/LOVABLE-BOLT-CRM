-- Add user_notes column to contacts table for manual notes
-- Separate from 'notes' which contains auto-extracted info
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_notes TEXT;