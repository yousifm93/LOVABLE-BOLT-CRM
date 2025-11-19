-- Add condo_ordered_date and condo_eta fields to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS condo_ordered_date date,
ADD COLUMN IF NOT EXISTS condo_eta date;

-- Add these fields to crm_fields for UI visibility
INSERT INTO crm_fields (field_name, display_name, description, section, field_type, is_required, is_visible, is_system_field, is_in_use, sort_order)
VALUES 
  ('condo_ordered_date', 'Condo Ordered Date', 'The date the condo questionnaire was ordered', 'DATE', 'date', false, true, false, true, 1000),
  ('condo_eta', 'Condo ETA', 'The expected date for condo questionnaire completion', 'DATE', 'date', false, true, false, true, 1001)
ON CONFLICT (field_name) DO NOTHING;