-- Fix field names in pipeline_views to match crm_fields
-- Replace 'name' with 'borrower_name' and fix other field name mismatches

-- Update leads pipeline view
UPDATE pipeline_views 
SET column_order = '["borrower_name", "phone", "email", "referred_via", "converted", "lead_strength", "task_eta", "created_at"]'::jsonb
WHERE pipeline_type = 'leads' AND name = 'Main View';

-- Update pending_app pipeline view
UPDATE pipeline_views 
SET column_order = '["borrower_name", "phone", "email", "teammate_assigned", "monthly_pmt_goal", "cash_to_close_goal", "created_at"]'::jsonb
WHERE pipeline_type = 'pending_app' AND name = 'Main View';

-- Update screening pipeline view
UPDATE pipeline_views 
SET column_order = '["borrower_name", "phone", "teammate_assigned", "fico_score", "dti", "total_monthly_income", "assets", "monthly_liabilities"]'::jsonb
WHERE pipeline_type = 'screening' AND name = 'Main View';

-- Update pre_qualified pipeline view (use existing fields only)
UPDATE pipeline_views 
SET column_order = '["borrower_name", "teammate_assigned", "approved_lender_id", "loan_amount", "fico_score", "close_date"]'::jsonb
WHERE pipeline_type = 'pre_qualified' AND name = 'Main View';

-- Update pre_approved pipeline view (use existing fields only)
UPDATE pipeline_views 
SET column_order = '["borrower_name", "teammate_assigned", "approved_lender_id", "loan_amount", "close_date", "loan_status"]'::jsonb
WHERE pipeline_type = 'pre_approved' AND name = 'Main View';

-- Update past_clients pipeline view
UPDATE pipeline_views 
SET column_order = '["borrower_name", "teammate_assigned", "approved_lender_id", "loan_amount", "close_date", "loan_status"]'::jsonb
WHERE pipeline_type = 'past_clients' AND name = 'Main View';