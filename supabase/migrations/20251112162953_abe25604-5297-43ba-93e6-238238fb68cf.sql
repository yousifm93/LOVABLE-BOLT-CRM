-- ==========================================
-- BATCH 4: FIELD CONSOLIDATION & CLEANUP
-- ==========================================

-- PART 1: Soft delete 18 fields
UPDATE public.crm_fields 
SET is_in_use = false, 
    updated_at = now()
WHERE field_name IN (
  'auto_loans', 
  'credit_card_debt', 
  'other_monthly_debts', 
  'student_loans',
  'base_employment_income', 
  'bonus_income', 
  'other_income', 
  'overtime_income', 
  'self_employment_income',
  'checking_account', 
  'gift_funds', 
  'investment_accounts', 
  'other_assets', 
  'retirement_accounts', 
  'savings_account',
  'insurance_file',
  'number_of_dependents',
  'time_at_current_address_months',
  'time_at_current_address_years'
);

-- PART 2: Add lender_loan_number to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lender_loan_number text;

-- PART 3: Create lender_loan_number CRM field
INSERT INTO public.crm_fields (
  field_name,
  display_name,
  section,
  field_type,
  description,
  is_required,
  is_visible,
  is_system_field,
  is_in_use,
  sort_order
) VALUES (
  'lender_loan_number',
  'Lender Loan #',
  'LOAN_PROPERTY',
  'text',
  'Loan number assigned by the lender (different from internal Arrive loan number)',
  false,
  true,
  false,
  true,
  105
) ON CONFLICT (field_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_in_use = true,
  updated_at = now();

-- PART 4: Rename estimated_fico to fico_score
UPDATE public.crm_fields 
SET field_name = 'fico_score',
    display_name = 'FICO Score',
    description = 'Borrower''s credit score (FICO)',
    updated_at = now()
WHERE field_name = 'estimated_fico';

-- Update leads table column name
ALTER TABLE public.leads 
RENAME COLUMN estimated_fico TO fico_score;

-- PART 5: Update consolidated field descriptions

-- Monthly Liabilities
UPDATE public.crm_fields 
SET display_name = 'Total Monthly Liabilities',
    description = 'Sum of all monthly debt obligations (credit cards, auto loans, student loans, other debts)',
    section = 'LOAN_PROPERTY',
    updated_at = now()
WHERE field_name = 'monthly_liabilities';

-- Total Monthly Income
UPDATE public.crm_fields 
SET display_name = 'Total Monthly Income',
    description = 'Sum of all monthly income sources (employment, overtime, bonus, self-employment, other)',
    section = 'LOAN_PROPERTY',
    updated_at = now()
WHERE field_name = 'total_monthly_income';

-- Total Assets
UPDATE public.crm_fields 
SET display_name = 'Total Assets',
    description = 'Sum of all borrower assets (checking, savings, investments, retirement accounts, gift funds, other)',
    section = 'LOAN_PROPERTY',
    updated_at = now()
WHERE field_name = 'assets';

-- PART 6: Organize Monthly Payment components

UPDATE public.crm_fields 
SET section = 'MONTHLY_PAYMENT',
    sort_order = 1,
    description = 'Principal and interest portion of the monthly payment',
    updated_at = now()
WHERE field_name = 'principal_interest';

UPDATE public.crm_fields 
SET section = 'MONTHLY_PAYMENT',
    sort_order = 2,
    description = 'Monthly property tax payment',
    updated_at = now()
WHERE field_name = 'property_taxes';

UPDATE public.crm_fields 
SET section = 'MONTHLY_PAYMENT',
    display_name = 'Monthly HOI',
    sort_order = 3,
    description = 'Monthly homeowner''s insurance premium',
    updated_at = now()
WHERE field_name = 'homeowners_insurance';

UPDATE public.crm_fields 
SET section = 'MONTHLY_PAYMENT',
    display_name = 'Monthly MI',
    sort_order = 4,
    description = 'Monthly mortgage insurance (PMI) payment',
    updated_at = now()
WHERE field_name = 'mortgage_insurance';

UPDATE public.crm_fields 
SET section = 'MONTHLY_PAYMENT',
    sort_order = 5,
    description = 'Monthly Homeowners Association dues',
    updated_at = now()
WHERE field_name = 'hoa_dues';

UPDATE public.crm_fields 
SET section = 'MONTHLY_PAYMENT',
    sort_order = 6,
    description = 'Total monthly payment (sum of Principal & Interest + Property Taxes + Homeowners Insurance + Mortgage Insurance + HOA Dues)',
    updated_at = now()
WHERE field_name = 'piti';

-- PART 7: Update DTI field
UPDATE public.crm_fields 
SET section = 'LOAN_PROPERTY',
    description = 'Debt-to-Income ratio calculated as (Total Monthly Liabilities + PITI) ÷ Total Monthly Income, expressed as a percentage',
    updated_at = now()
WHERE field_name = 'dti';