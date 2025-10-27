-- Add missing borrower information fields to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ssn TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS number_of_dependents INTEGER;

-- Add comments for clarity
COMMENT ON COLUMN leads.ssn IS 'Sensitive PII - Social Security Number';
COMMENT ON COLUMN leads.number_of_dependents IS 'Number of dependents for the borrower';