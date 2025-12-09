-- Add loan estimate fee fields to leads table

-- Lender Fees (Section A)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS underwriting_fee numeric;

-- Third Party Fees (Section B) - Services You Cannot Shop For
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS appraisal_fee numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS credit_report_fee numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS processing_fee numeric;

-- Third Party Fees (Section B) - Services You Can Shop For
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS lenders_title_insurance numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS title_closing_fee numeric;

-- Taxes & Government Fees (Section C)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS intangible_tax numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS transfer_tax numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS recording_fees numeric;

-- Prepaids & Escrow (Section D)
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prepaid_hoi numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prepaid_interest numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS escrow_hoi numeric;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS escrow_taxes numeric;

-- Adjustments
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS adjustments_credits numeric;