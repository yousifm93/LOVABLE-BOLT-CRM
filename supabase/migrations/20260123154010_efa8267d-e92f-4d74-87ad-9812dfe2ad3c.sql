-- Update Ashley Merizio's permissions from 'hidden' to 'locked'
UPDATE user_permissions SET
  home = 'locked',
  dashboard = 'locked',
  email = 'locked',
  pipeline_leads = 'locked',
  pipeline_pending_app = 'locked',
  pipeline_screening = 'locked',
  pipeline_pre_qualified = 'locked',
  pipeline_pre_approved = 'locked',
  pipeline_past_clients = 'locked',
  pipeline_idle = 'locked',
  lead_details_all_fields = 'locked'
WHERE user_id = '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a';