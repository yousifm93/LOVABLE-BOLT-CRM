-- Insert stage timestamp fields into crm_fields
INSERT INTO public.crm_fields (
  field_name,
  display_name,
  section,
  field_type,
  is_required,
  is_visible,
  is_system_field,
  is_in_use,
  sort_order
) VALUES
  ('pending_app_at', 'Pending App On', 'PENDING APP', 'datetime', false, true, true, true, 100),
  ('app_complete_at', 'App Complete On', 'SCREENING', 'datetime', false, true, true, true, 100),
  ('pre_qualified_at', 'Pre-Qualified On', 'PRE-QUALIFIED', 'datetime', false, true, true, true, 100),
  ('pre_approved_at', 'Pre-Approved On', 'PRE-APPROVED', 'datetime', false, true, true, true, 100),
  ('active_at', 'Active On', 'ACTIVE', 'datetime', false, true, true, true, 100),
  ('closed_at', 'Closed On', 'PAST CLIENTS', 'datetime', false, true, true, true, 100)
ON CONFLICT (field_name) DO NOTHING;