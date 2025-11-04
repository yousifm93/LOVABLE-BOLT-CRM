-- Add document_id column to lead_conditions table to link conditions to documents
ALTER TABLE lead_conditions 
ADD COLUMN document_id uuid REFERENCES documents(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_conditions_document_id ON lead_conditions(document_id);