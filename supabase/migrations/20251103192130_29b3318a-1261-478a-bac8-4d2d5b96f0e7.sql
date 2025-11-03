-- Add 'notes' field to crm_fields for Field Management and Hide/Show visibility
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
)
SELECT 
  'notes', 
  'About the Borrower', 
  'LEAD', 
  'text', 
  false, 
  true, 
  false, 
  true,
  COALESCE((SELECT MAX(sort_order) + 1 FROM crm_fields WHERE section = 'LEAD'), 100)
WHERE NOT EXISTS (
  SELECT 1 FROM crm_fields WHERE field_name = 'notes'
);