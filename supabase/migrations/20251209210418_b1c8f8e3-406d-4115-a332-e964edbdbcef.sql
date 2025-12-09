-- Add APR field to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS apr numeric;

-- Add APR to crm_fields for Field Management
INSERT INTO crm_fields (field_name, display_name, description, section, field_type, is_required, is_visible, is_system_field, is_in_use, sort_order)
VALUES ('apr', 'APR', 'Annual Percentage Rate calculated from finance charges', 'LOAN INFO', 'percentage', false, true, false, true, 15)
ON CONFLICT (field_name) DO UPDATE SET 
  display_name = 'APR',
  description = 'Annual Percentage Rate calculated from finance charges',
  is_visible = true,
  is_in_use = true,
  updated_at = now();