-- Clean up team email contacts that were incorrectly added
DELETE FROM contacts 
WHERE email LIKE '%@mortgagebolt.com' 
  AND approval_status = 'pending';

DELETE FROM contacts 
WHERE email LIKE '%@mortgagebolt.org' 
  AND approval_status = 'pending';