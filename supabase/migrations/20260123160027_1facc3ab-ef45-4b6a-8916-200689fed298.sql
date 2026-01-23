-- Add new homepage permission columns
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS home_activity_panel TEXT DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_market_rates TEXT DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_daily_reports TEXT DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS home_monthly_reports TEXT DEFAULT 'visible';

-- Update Ashley's homepage permissions (ID: 3dca68fc-ee7e-46cc-91a1-0c6176d4c32a)
UPDATE user_permissions SET
  home_inbox = 'locked',
  home_agents = 'locked',
  home_lenders = 'locked',
  home_active_files = 'visible',
  home_loan_estimate = 'locked',
  home_income_calculator = 'locked',
  home_loan_pricer = 'locked',
  home_bolt_bot = 'locked',
  home_calendar = 'locked',
  home_activity_panel = 'locked',
  home_market_rates = 'locked',
  home_daily_reports = 'locked',
  home_monthly_reports = 'locked'
WHERE user_id = '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a';