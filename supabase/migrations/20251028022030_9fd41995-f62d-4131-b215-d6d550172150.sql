-- Add priority column to leads table
ALTER TABLE leads 
ADD COLUMN priority TEXT CHECK (priority IN ('High', 'Medium', 'Low'));

-- Add to crm_fields
INSERT INTO crm_fields (
  field_name,
  display_name,
  field_type,
  section,
  is_in_use,
  is_required,
  dropdown_options
) VALUES (
  'priority',
  'Priority',
  'select',
  'LEAD INFORMATION',
  true,
  false,
  '["High", "Medium", "Low"]'::jsonb
);