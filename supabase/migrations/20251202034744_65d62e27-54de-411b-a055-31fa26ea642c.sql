-- Add MB Loan Number column (rename arrive_loan_number to mb_loan_number)
ALTER TABLE leads RENAME COLUMN arrive_loan_number TO mb_loan_number;

-- Add new_at column for tracking when lead enters New stage
ALTER TABLE leads ADD COLUMN IF NOT EXISTS new_at TIMESTAMP WITH TIME ZONE;