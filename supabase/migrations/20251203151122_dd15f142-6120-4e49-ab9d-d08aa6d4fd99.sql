-- Add new columns to lenders table
ALTER TABLE lenders
ADD COLUMN IF NOT EXISTS broker_portal_username text,
ADD COLUMN IF NOT EXISTS broker_portal_password text,
ADD COLUMN IF NOT EXISTS min_loan_amount numeric,
ADD COLUMN IF NOT EXISTS max_loan_amount numeric;