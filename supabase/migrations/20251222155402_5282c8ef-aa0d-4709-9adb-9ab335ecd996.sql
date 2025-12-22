-- Clear all pending email field suggestions to reset the notification count to 0
UPDATE email_field_suggestions 
SET status = 'denied', reviewed_at = NOW() 
WHERE status = 'pending';