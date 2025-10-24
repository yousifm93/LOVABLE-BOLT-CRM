-- Add "New" and "SUB" to loan_status ENUM
-- Note: ENUM values must be added in separate transactions
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'New';
ALTER TYPE loan_status ADD VALUE IF NOT EXISTS 'SUB';