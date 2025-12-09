-- Deactivate the old computed loanNumber field
UPDATE crm_fields 
SET is_in_use = false, is_visible = false, updated_at = now()
WHERE field_name = 'loanNumber' AND field_type = 'computed';