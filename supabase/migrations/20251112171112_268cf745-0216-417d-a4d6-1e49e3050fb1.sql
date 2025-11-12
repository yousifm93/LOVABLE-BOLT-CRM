-- Hard delete 18 deprecated fields from leads table and crm_fields

-- Step 1: Drop columns from leads table
-- Income breakdown (5 fields)
ALTER TABLE leads DROP COLUMN IF EXISTS base_employment_income;
ALTER TABLE leads DROP COLUMN IF EXISTS overtime_income;
ALTER TABLE leads DROP COLUMN IF EXISTS bonus_income;
ALTER TABLE leads DROP COLUMN IF EXISTS self_employment_income;
ALTER TABLE leads DROP COLUMN IF EXISTS other_income;

-- Asset breakdown (6 fields)
ALTER TABLE leads DROP COLUMN IF EXISTS checking_account;
ALTER TABLE leads DROP COLUMN IF EXISTS savings_account;
ALTER TABLE leads DROP COLUMN IF EXISTS investment_accounts;
ALTER TABLE leads DROP COLUMN IF EXISTS retirement_accounts;
ALTER TABLE leads DROP COLUMN IF EXISTS gift_funds;
ALTER TABLE leads DROP COLUMN IF EXISTS other_assets;

-- Liability breakdown (4 fields)
ALTER TABLE leads DROP COLUMN IF EXISTS credit_card_debt;
ALTER TABLE leads DROP COLUMN IF EXISTS auto_loans;
ALTER TABLE leads DROP COLUMN IF EXISTS student_loans;
ALTER TABLE leads DROP COLUMN IF EXISTS other_monthly_debts;

-- Deprecated borrower fields (3 fields)
ALTER TABLE leads DROP COLUMN IF EXISTS number_of_dependents;
ALTER TABLE leads DROP COLUMN IF EXISTS time_at_current_address_years;
ALTER TABLE leads DROP COLUMN IF EXISTS time_at_current_address_months;

-- Step 2: Delete rows from crm_fields table
DELETE FROM crm_fields WHERE field_name IN (
  -- Income breakdown
  'base_employment_income', 'overtime_income', 'bonus_income', 
  'self_employment_income', 'other_income',
  
  -- Asset breakdown
  'checking_account', 'savings_account', 'investment_accounts', 
  'retirement_accounts', 'gift_funds', 'other_assets',
  
  -- Liability breakdown
  'credit_card_debt', 'auto_loans', 'student_loans', 'other_monthly_debts',
  
  -- Deprecated borrower fields
  'number_of_dependents', 'time_at_current_address_years', 'time_at_current_address_months'
);