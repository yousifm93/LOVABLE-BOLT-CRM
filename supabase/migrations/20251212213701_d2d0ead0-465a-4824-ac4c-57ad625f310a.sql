-- Fix incorrectly stored MIME types in documents table
-- Documents that have file extensions like .pdf but wrong mime_type values

UPDATE documents 
SET mime_type = 'application/pdf' 
WHERE LOWER(file_url) LIKE '%.pdf' 
  AND mime_type NOT LIKE '%pdf%';

UPDATE documents 
SET mime_type = 'image/png' 
WHERE LOWER(file_url) LIKE '%.png' 
  AND mime_type NOT LIKE '%image%';

UPDATE documents 
SET mime_type = 'image/jpeg' 
WHERE (LOWER(file_url) LIKE '%.jpg' OR LOWER(file_url) LIKE '%.jpeg')
  AND mime_type NOT LIKE '%image%';