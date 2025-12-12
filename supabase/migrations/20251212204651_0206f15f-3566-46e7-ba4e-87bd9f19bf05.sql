-- Fix documents with incorrect MIME types (category stored instead of actual MIME type)
UPDATE documents 
SET mime_type = 'application/pdf' 
WHERE mime_type IN ('Pay Stubs', 'Tax Returns', 'W-2 Forms', 'Photo ID', 'Bank Statements', 'Other Documents')
  AND (file_url LIKE '%.pdf' OR file_name LIKE '%.pdf');

-- Also fix any image types stored incorrectly
UPDATE documents 
SET mime_type = 'image/png' 
WHERE mime_type IN ('Pay Stubs', 'Tax Returns', 'W-2 Forms', 'Photo ID', 'Bank Statements', 'Other Documents')
  AND (file_url LIKE '%.png' OR file_name LIKE '%.png');

UPDATE documents 
SET mime_type = 'image/jpeg' 
WHERE mime_type IN ('Pay Stubs', 'Tax Returns', 'W-2 Forms', 'Photo ID', 'Bank Statements', 'Other Documents')
  AND (file_url LIKE '%.jpg' OR file_name LIKE '%.jpg' OR file_url LIKE '%.jpeg' OR file_name LIKE '%.jpeg');