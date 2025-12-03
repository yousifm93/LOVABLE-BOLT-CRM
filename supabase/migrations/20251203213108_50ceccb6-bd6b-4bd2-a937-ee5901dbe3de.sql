-- Add file fields to leads table for Active File Documents section
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS le_file TEXT,
ADD COLUMN IF NOT EXISTS contract_file TEXT,
ADD COLUMN IF NOT EXISTS initial_approval_file TEXT,
ADD COLUMN IF NOT EXISTS disc_file TEXT,
ADD COLUMN IF NOT EXISTS appraisal_file TEXT,
ADD COLUMN IF NOT EXISTS insurance_file TEXT,
ADD COLUMN IF NOT EXISTS icd_file TEXT,
ADD COLUMN IF NOT EXISTS fcp_file TEXT,
ADD COLUMN IF NOT EXISTS insurance_policy_file TEXT,
ADD COLUMN IF NOT EXISTS inspection_file TEXT,
ADD COLUMN IF NOT EXISTS title_file TEXT,
ADD COLUMN IF NOT EXISTS condo_file TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.leads.le_file IS 'Loan Estimate file path';
COMMENT ON COLUMN public.leads.contract_file IS 'Contract file path';
COMMENT ON COLUMN public.leads.initial_approval_file IS 'Initial Approval file path';
COMMENT ON COLUMN public.leads.disc_file IS 'Disclosures file path';
COMMENT ON COLUMN public.leads.appraisal_file IS 'Appraisal Report file path';
COMMENT ON COLUMN public.leads.insurance_file IS 'Insurance Binder file path';
COMMENT ON COLUMN public.leads.icd_file IS 'Initial CD file path';
COMMENT ON COLUMN public.leads.fcp_file IS 'Final Closing Package file path';
COMMENT ON COLUMN public.leads.insurance_policy_file IS 'Insurance Policy file path';
COMMENT ON COLUMN public.leads.inspection_file IS 'Inspection Report file path';
COMMENT ON COLUMN public.leads.title_file IS 'Title Work file path';
COMMENT ON COLUMN public.leads.condo_file IS 'Condo Documents file path';