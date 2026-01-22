-- Add rejection_notes and review timestamps to borrower_tasks
ALTER TABLE borrower_tasks 
ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- Add review timestamps and rejection_notes to borrower_documents  
ALTER TABLE borrower_documents
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_notes TEXT;