-- Add home_calendar permission column
ALTER TABLE public.user_permissions
ADD COLUMN IF NOT EXISTS home_calendar TEXT DEFAULT 'visible';

-- Update Salma's permissions (159376ae-30e9-4997-b61f-76ab8d7f224b)
UPDATE user_permissions SET
  home = 'visible',
  home_inbox = 'locked',
  home_calendar = 'locked',
  home_loan_estimate = 'visible',
  home_income_calculator = 'visible',
  home_loan_pricer = 'visible',
  home_bolt_bot = 'visible',
  dashboard = 'visible',
  tasks = 'visible',
  contacts_borrowers = 'locked',
  resources = 'visible',
  resources_bolt_bot = 'visible',
  resources_email_marketing = 'locked',
  resources_condolist = 'visible',
  resources_preapproval = 'visible',
  calculators = 'visible',
  calculators_loan_pricer = 'visible',
  calculators_property_value = 'visible',
  calculators_income = 'visible',
  calculators_estimate = 'visible',
  admin = 'locked'
WHERE user_id = '159376ae-30e9-4997-b61f-76ab8d7f224b';

-- Update Herman's permissions (fa92a4c6-890d-4d69-99a8-c3adc6c904ee)
UPDATE user_permissions SET
  home = 'visible',
  home_inbox = 'locked',
  home_calendar = 'locked',
  dashboard = 'visible',
  tasks = 'visible',
  email = 'locked',
  contacts_borrowers = 'visible',
  resources = 'visible',
  resources_bolt_bot = 'visible',
  resources_email_marketing = 'locked',
  resources_condolist = 'visible',
  resources_preapproval = 'visible',
  calculators = 'visible',
  admin = 'locked'
WHERE user_id = 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';