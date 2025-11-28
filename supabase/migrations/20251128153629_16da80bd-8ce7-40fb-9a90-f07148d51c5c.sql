-- Create default pipeline views for all pipeline types (using correct pipeline type values)

-- Insert default view for Leads pipeline
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
VALUES (
  'leads',
  'Main View',
  '["name", "phone", "email", "referred_via", "converted", "lead_strength", "task_eta", "createdOn"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Insert default view for Pending App pipeline
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
VALUES (
  'pending_app',
  'Main View',
  '["name", "phone", "email", "teammate_assigned", "monthly_pmt_goal", "cash_to_close_goal", "createdOn"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Insert default view for Screening pipeline
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
VALUES (
  'screening',
  'Main View',
  '["name", "phone", "teammate_assigned", "fico_score", "dti", "total_monthly_income", "assets", "monthly_liabilities"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Insert default view for Pre-Qualified pipeline
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
VALUES (
  'pre_qualified',
  'Main View',
  '["name", "teammate_assigned", "lender_id", "loan_amount", "approval_type", "initial_approval_date"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Insert default view for Pre-Approved pipeline
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
VALUES (
  'pre_approved',
  'Main View',
  '["name", "teammate_assigned", "lender_id", "loan_amount", "approval_amount", "approval_expiration"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- Update existing Active pipeline view to be default if it's the test view
UPDATE public.pipeline_views 
SET is_default = true, name = 'Main View'
WHERE pipeline_type = 'active' AND name = 'test';

-- Insert default view for Active pipeline if no default exists
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
SELECT 
  'active',
  'Main View',
  '["name", "teammate_assigned", "lender_id", "lender_loan_number", "loan_amount", "disclosure_status", "close_date", "loan_status", "appraisal_status", "title_status", "hoi_status", "condo_status", "cd_status", "package_status", "lock_expiration_date", "ba_status", "epo_status", "buyer_agent_id", "listing_agent_id"]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.pipeline_views WHERE pipeline_type = 'active' AND is_default = true
);

-- Insert default view for Past Clients pipeline
INSERT INTO public.pipeline_views (pipeline_type, name, column_order, is_default)
VALUES (
  'past_clients',
  'Main View',
  '["name", "teammate_assigned", "lender_id", "loan_amount", "close_date", "loan_status"]'::jsonb,
  true
) ON CONFLICT DO NOTHING;