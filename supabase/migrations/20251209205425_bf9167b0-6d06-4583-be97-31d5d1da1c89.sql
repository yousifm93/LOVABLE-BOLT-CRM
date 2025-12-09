-- Add MB App Number to crm_fields so it shows in Field Management
INSERT INTO crm_fields (field_name, display_name, description, section, field_type, is_required, is_visible, is_system_field, is_in_use, sort_order)
VALUES ('mb_loan_number', 'MB App Number', 'Mortgage Bolt Application Number', 'LOAN INFO', 'text', false, true, false, true, 3)
ON CONFLICT (field_name) DO UPDATE SET 
  display_name = 'MB App Number',
  description = 'Mortgage Bolt Application Number',
  is_visible = true,
  is_in_use = true,
  updated_at = now();