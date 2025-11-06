-- Add appraisal fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS appraisal_notes TEXT;

-- Add title fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS title_ordered_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS title_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS title_notes TEXT;

-- Add insurance fields  
ALTER TABLE leads ADD COLUMN IF NOT EXISTS insurance_policy_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS insurance_inspection_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS insurance_notes TEXT;

-- Add condo fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS condo_name TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS condo_docs_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS condo_approval_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS condo_notes TEXT;