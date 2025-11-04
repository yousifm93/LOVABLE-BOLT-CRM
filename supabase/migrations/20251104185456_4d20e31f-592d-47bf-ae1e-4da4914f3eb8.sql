-- Add tracking fields for notes and file updates to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS notes_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS notes_updated_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS latest_file_updates text,
ADD COLUMN IF NOT EXISTS latest_file_updates_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS latest_file_updates_updated_by uuid REFERENCES users(id);