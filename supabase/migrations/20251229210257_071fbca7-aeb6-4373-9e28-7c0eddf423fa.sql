-- Add homepage card permission columns to user_permissions table
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS home_inbox text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_agents text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_lenders text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_active_files text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_loan_estimate text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_income_calculator text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_loan_pricer text DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_bolt_bot text DEFAULT 'visible';