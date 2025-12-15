-- Add new columns to lenders table for comprehensive lender management

-- Date Fields
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS initial_approval_date date;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS renewed_on date;

-- Product Fields (Y/N/TBD)
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_bs_loan text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_manufactured_homes text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_fha text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_va text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_coop text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_conv text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_wvoe text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_high_dti text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_condo_hotel text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_dr_loan text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_fn text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_nwc text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_heloc text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_5_8_unit text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_9_plus_unit text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_commercial text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_construction text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_land_loan text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_fthb_dscr text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_jumbo text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_dpa text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_no_income_primary text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_low_fico text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_inv_heloc text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_no_seasoning_cor text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_tbd_uw text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_condo_review_desk text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_condo_mip_issues text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_nonqm_heloc text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_fn_heloc text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_no_credit text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_558 text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_itin text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_pl_program text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_1099_program text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_wvoe_family text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_1099_less_1yr text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_1099_no_biz text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_omit_student_loans text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS product_no_ratio_dscr text;

-- Clause Fields (long text)
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS title_clause text;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS insurance_clause text;

-- Number Fields
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS condotel_min_sqft integer;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS asset_dep_months integer;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS min_fico integer;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS min_sqft integer;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS heloc_min_fico integer;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS heloc_min numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS max_cash_out_70_ltv numeric;

-- LTV Fields (percentages)
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS heloc_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS fn_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS bs_loan_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS ltv_1099 numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS pl_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS condo_inv_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS jumbo_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS wvoe_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS dscr_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS fha_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS conv_max_ltv numeric;
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS max_ltv numeric;

-- EPO Field
ALTER TABLE public.lenders ADD COLUMN IF NOT EXISTS epo_period text;

-- Add comments for documentation
COMMENT ON COLUMN public.lenders.product_bs_loan IS 'Bank Statement Loan Income Calc - Y/N/TBD';
COMMENT ON COLUMN public.lenders.product_manufactured_homes IS 'Manufactured Homes - Y/N/TBD';
COMMENT ON COLUMN public.lenders.product_fha IS 'FHA Loans - Y/N/TBD';
COMMENT ON COLUMN public.lenders.product_va IS 'VA Loans - Y/N/TBD';
COMMENT ON COLUMN public.lenders.title_clause IS 'Title clause text for this lender';
COMMENT ON COLUMN public.lenders.insurance_clause IS 'Insurance clause text for this lender';
COMMENT ON COLUMN public.lenders.epo_period IS 'Early Payoff Period details';