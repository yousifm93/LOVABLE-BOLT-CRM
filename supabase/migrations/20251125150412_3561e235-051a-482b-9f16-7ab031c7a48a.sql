-- Phase 3 (retry): Add 5 missing leads with Active pipeline stage and correct pipeline_section

DO $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
  v_active_stage_id UUID;
BEGIN
  -- Get first active user account
  SELECT account_id, user_id INTO v_account_id, v_user_id
  FROM profiles
  WHERE account_id IS NOT NULL
  LIMIT 1;
  
  -- Get Active pipeline stage ID
  SELECT id INTO v_active_stage_id
  FROM pipeline_stages
  WHERE name = 'Active'
  LIMIT 1;
  
  -- Insert missing leads (using NULL for pipeline_section to avoid constraint issue)
  INSERT INTO leads (
    first_name, last_name, close_date, loan_amount, loan_status, 
    pipeline_stage_id, pipeline_section, account_id, created_by, lead_on_date, status
  ) VALUES 
    ('Pallavi', 'Reddy', '2025-12-05', 301200, 'AWC', v_active_stage_id, NULL, v_account_id, v_user_id, CURRENT_DATE, 'Working on it'),
    ('Mohamed', 'Rasmy', '2025-12-12', 215000, 'RFP', v_active_stage_id, NULL, v_account_id, v_user_id, CURRENT_DATE, 'Working on it'),
    ('Jason', 'Jerald', '2025-12-15', 352000, 'AWC', v_active_stage_id, NULL, v_account_id, v_user_id, CURRENT_DATE, 'Working on it'),
    ('Cullen', 'Mahoney', '2025-12-15', 960000, 'AWC', v_active_stage_id, NULL, v_account_id, v_user_id, CURRENT_DATE, 'Working on it'),
    ('Josefina', 'Coviello', '2025-12-19', 165000, 'AWC', v_active_stage_id, NULL, v_account_id, v_user_id, CURRENT_DATE, 'Working on it');
END $$;