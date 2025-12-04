-- Add dropdown options for marital_status field
UPDATE crm_fields 
SET dropdown_options = '["Single", "Married", "Separated"]'::jsonb
WHERE field_name = 'marital_status';

-- Add dropdown options for demographic_gender field  
UPDATE crm_fields 
SET dropdown_options = '["Male", "Female", "Other", "Prefer not to say"]'::jsonb
WHERE field_name = 'demographic_gender';

-- Update residency_type dropdown options to match normalized values
UPDATE crm_fields 
SET dropdown_options = '["US Citizen", "Permanent Resident", "Non-Permanent Resident", "Foreign National"]'::jsonb
WHERE field_name = 'residency_type';

-- Also fix residency_status if it exists (rename to residency_type)
UPDATE crm_fields 
SET field_name = 'residency_type',
    dropdown_options = '["US Citizen", "Permanent Resident", "Non-Permanent Resident", "Foreign National"]'::jsonb
WHERE field_name = 'residency_status';