-- Update program field dropdown options to include Bank Statement
UPDATE crm_fields 
SET dropdown_options = '["Conventional", "FHA", "VA", "DSCR", "Jumbo", "USDA", "Bank Statement"]'::jsonb,
    updated_at = now()
WHERE field_name = 'program';