-- Update Active pipeline Main View column widths
-- Set most columns to 95px, except borrower_name (150), team (100), and loan number columns (150)
UPDATE pipeline_views
SET column_widths = jsonb_build_object(
  'borrower_name', 150,
  'team', 100,
  'lender_loan_number', 150,
  'arrive_loan_number', 150,
  'lender', 95,
  'loan_amount', 95,
  'disclosure_status', 95,
  'close_date', 95,
  'loan_status', 95,
  'appraisal_status', 95,
  'title_status', 95,
  'hoi_status', 95,
  'condo_status', 95,
  'cd_status', 95,
  'package_status', 95,
  'lock_expiration_date', 95,
  'ba_status', 95,
  'epo_status', 95,
  'buyer_agent', 95,
  'listing_agent', 95
)
WHERE pipeline_type = 'active' AND name = 'Main View';