-- Update the crm_fields table to rename Escrows to Escrow and update dropdown options
UPDATE crm_fields
SET 
  display_name = 'Escrow',
  dropdown_options = '["Yes", "No"]'::jsonb
WHERE field_name = 'escrows';

-- Also update any existing leads with old values to new format
UPDATE leads
SET escrows = 'Yes'
WHERE escrows IN ('NOT WAIVED', 'Escrowed', 'not waived', 'escrowed');

UPDATE leads
SET escrows = 'No'
WHERE escrows IN ('WAIVED', 'Waived', 'waived');