-- Clear all pending email field suggestions to start fresh from today
DELETE FROM email_field_suggestions 
WHERE status = 'pending';