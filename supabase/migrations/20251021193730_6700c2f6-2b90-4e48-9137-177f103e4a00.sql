-- Add missing fields from Excel spreadsheet to leads table

-- Field #2: Middle Name
ALTER TABLE leads ADD COLUMN IF NOT EXISTS middle_name TEXT;

-- Field #9: Monthly Payment Goal
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_pmt_goal NUMERIC;

-- Field #10: Cash to Close Goal
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cash_to_close_goal NUMERIC;

-- Field #12: Income Type
ALTER TABLE leads ADD COLUMN IF NOT EXISTS income_type TEXT;

-- Field #13: REO (Yes/No)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS reo BOOLEAN DEFAULT false;

-- Field #16: Borrower Current Address
ALTER TABLE leads ADD COLUMN IF NOT EXISTS borrower_current_address TEXT;

-- Field #17: Own/Rent Current Address
ALTER TABLE leads ADD COLUMN IF NOT EXISTS own_rent_current_address TEXT;

-- Field #18: Time at Current Address (split into years and months)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS time_at_current_address_years INTEGER;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS time_at_current_address_months INTEGER;

-- Field #19: Military/Veteran (Yes/No)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS military_veteran BOOLEAN DEFAULT false;

-- Field #20: Date of Birth
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dob DATE;

-- Field #21: Estimated FICO
ALTER TABLE leads ADD COLUMN IF NOT EXISTS estimated_fico INTEGER;

-- Field #23: Sales Price
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sales_price NUMERIC;

-- Field #24: Down Payment (can be % or $)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS down_pmt TEXT;

-- Field #25: Term (Amortization)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS term INTEGER;

-- Field #26: Monthly Liabilities
ALTER TABLE leads ADD COLUMN IF NOT EXISTS monthly_liabilities NUMERIC;

-- Field #27: Assets
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assets NUMERIC;

-- Field #28-32: Subject Property Address
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject_address_1 TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject_address_2 TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject_city TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject_state TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS subject_zip TEXT;

-- Field #34: Interest Rate
ALTER TABLE leads ADD COLUMN IF NOT EXISTS interest_rate NUMERIC;

-- Field #35: PITI (calculated but stored)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS piti NUMERIC;

-- Field #36: Program
ALTER TABLE leads ADD COLUMN IF NOT EXISTS program TEXT;

-- Field #37: Total Monthly Income (calculated but stored)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS total_monthly_income NUMERIC;

-- Field #38: Escrows
ALTER TABLE leads ADD COLUMN IF NOT EXISTS escrows TEXT;

-- Field #39: DTI (calculated but stored)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS dti NUMERIC;

-- Field #46: MI Status
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mi_status TEXT;

-- Field #54: Title ETA
ALTER TABLE leads ADD COLUMN IF NOT EXISTS title_eta DATE;

-- Field #55: Appraisal Date/Time
ALTER TABLE leads ADD COLUMN IF NOT EXISTS appr_date_time TIMESTAMP WITH TIME ZONE;

-- Field #56: Appraisal ETA
ALTER TABLE leads ADD COLUMN IF NOT EXISTS appr_eta DATE;

-- Field #57: Appraisal Value
ALTER TABLE leads ADD COLUMN IF NOT EXISTS appraisal_value TEXT;

-- Field #58: Financing Contingency
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fin_cont DATE;

-- Fields #59-66: File uploads (store file paths)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS les_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contract_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS initial_approval_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS disc_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS appraisal_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS insurance_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS icd_file TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS fcp_file TEXT;

-- Fields #67-71: PITI Breakdown
ALTER TABLE leads ADD COLUMN IF NOT EXISTS principal_interest NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS property_taxes NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS homeowners_insurance NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS mortgage_insurance NUMERIC;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS hoa_dues NUMERIC;

-- Search stage field for PreQualified/PreApproved distinction
ALTER TABLE leads ADD COLUMN IF NOT EXISTS search_stage TEXT;