-- Add income breakdown fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS base_employment_income NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS overtime_income NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bonus_income NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS self_employment_income NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS other_income NUMERIC;

-- Add asset breakdown fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS checking_account NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS savings_account NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS investment_accounts NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS retirement_accounts NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gift_funds NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS other_assets NUMERIC;

-- Add debt breakdown fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS credit_card_debt NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS auto_loans NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS student_loans NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS other_monthly_debts NUMERIC;

-- Add comments
COMMENT ON COLUMN leads.base_employment_income IS 'Base monthly employment income';
COMMENT ON COLUMN leads.overtime_income IS 'Monthly overtime income';
COMMENT ON COLUMN leads.bonus_income IS 'Monthly bonus income';
COMMENT ON COLUMN leads.self_employment_income IS 'Monthly self-employment income';
COMMENT ON COLUMN leads.other_income IS 'Other monthly income';
COMMENT ON COLUMN leads.checking_account IS 'Checking account balance';
COMMENT ON COLUMN leads.savings_account IS 'Savings account balance';
COMMENT ON COLUMN leads.investment_accounts IS 'Investment account balances';
COMMENT ON COLUMN leads.retirement_accounts IS 'Retirement account balances (401k, IRA, etc.)';
COMMENT ON COLUMN leads.gift_funds IS 'Gift funds available';
COMMENT ON COLUMN leads.other_assets IS 'Other asset values';
COMMENT ON COLUMN leads.credit_card_debt IS 'Monthly credit card debt payments';
COMMENT ON COLUMN leads.auto_loans IS 'Monthly auto loan payments';
COMMENT ON COLUMN leads.student_loans IS 'Monthly student loan payments';
COMMENT ON COLUMN leads.other_monthly_debts IS 'Other monthly debt payments';