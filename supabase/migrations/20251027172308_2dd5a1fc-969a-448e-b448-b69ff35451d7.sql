-- Add residency type field
ALTER TABLE leads ADD COLUMN IF NOT EXISTS residency_type TEXT;

-- Add marital status field  
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marital_status TEXT;

-- Add comments for documentation
COMMENT ON COLUMN leads.residency_type IS 'Borrower residency status: US Citizen, Permanent Resident, or Non-Permanent Resident Alien';
COMMENT ON COLUMN leads.marital_status IS 'Borrower marital status: Unmarried, Married, or Separated';