-- Add source column to documents table to track where documents came from
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Add a comment for documentation
COMMENT ON COLUMN documents.source IS 'Source of the document: manual, email_attachment, borrower_upload, application';