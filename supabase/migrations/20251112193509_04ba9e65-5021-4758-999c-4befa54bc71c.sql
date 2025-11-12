-- Remove orphaned borrower_phone field (database only has 'phone')
DELETE FROM crm_fields WHERE field_name = 'borrower_phone';