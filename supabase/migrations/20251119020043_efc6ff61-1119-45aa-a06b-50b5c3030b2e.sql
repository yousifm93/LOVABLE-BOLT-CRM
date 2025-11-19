-- Add cash_to_close and closing_costs fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS cash_to_close numeric,
ADD COLUMN IF NOT EXISTS closing_costs numeric;

-- Add fields to crm_fields table
INSERT INTO crm_fields (field_name, display_name, description, section, field_type, is_required, is_visible, is_system_field, is_in_use, sort_order)
VALUES 
  ('cash_to_close', 'Cash to Close', 'Total cash required to close (down payment + closing costs)', 'LOAN INFO', 'currency', false, true, false, true, 1000),
  ('closing_costs', 'Closing Costs', 'Total estimated closing costs', 'LOAN INFO', 'currency', false, true, false, true, 1001)
ON CONFLICT (field_name) DO NOTHING;