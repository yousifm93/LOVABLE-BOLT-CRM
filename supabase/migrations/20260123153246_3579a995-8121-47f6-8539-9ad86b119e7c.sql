-- Add new permission columns for fine-grained control
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS default_landing_page TEXT DEFAULT '/',
ADD COLUMN IF NOT EXISTS lead_details_all_fields TEXT DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS lead_details_send_email TEXT DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS filter_leads_by_assignment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pipeline_idle TEXT DEFAULT 'visible';

-- Update Ashley Merizio's permissions (user_id: 3dca68fc-ee7e-46cc-91a1-0c6176d4c32a)
INSERT INTO user_permissions (
  user_id,
  -- Top-level sections
  home, dashboard, email, tasks, pipeline, contacts, resources, calculators, admin,
  -- Pipeline sub-items
  pipeline_leads, pipeline_pending_app, pipeline_screening, pipeline_pre_qualified, 
  pipeline_pre_approved, pipeline_active, pipeline_past_clients, pipeline_idle,
  -- New columns
  default_landing_page, lead_details_all_fields, lead_details_send_email, filter_leads_by_assignment
) VALUES (
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  -- Top-level: home hidden, dashboard hidden, email hidden, tasks visible, pipeline visible, contacts locked, resources locked, calculators locked, admin locked
  'hidden', 'hidden', 'hidden', 'visible', 'visible', 'locked', 'locked', 'locked', 'locked',
  -- Pipeline: all hidden except active
  'hidden', 'hidden', 'hidden', 'hidden', 'hidden', 'visible', 'hidden', 'hidden',
  -- New columns: default to /active, hide all fields, lock send email, filter by assignment
  '/active', 'hidden', 'locked', true
)
ON CONFLICT (user_id) DO UPDATE SET
  home = 'hidden',
  dashboard = 'hidden',
  email = 'hidden',
  tasks = 'visible',
  pipeline = 'visible',
  contacts = 'locked',
  resources = 'locked',
  calculators = 'locked',
  admin = 'locked',
  pipeline_leads = 'hidden',
  pipeline_pending_app = 'hidden',
  pipeline_screening = 'hidden',
  pipeline_pre_qualified = 'hidden',
  pipeline_pre_approved = 'hidden',
  pipeline_active = 'visible',
  pipeline_past_clients = 'hidden',
  pipeline_idle = 'hidden',
  default_landing_page = '/active',
  lead_details_all_fields = 'hidden',
  lead_details_send_email = 'locked',
  filter_leads_by_assignment = true;