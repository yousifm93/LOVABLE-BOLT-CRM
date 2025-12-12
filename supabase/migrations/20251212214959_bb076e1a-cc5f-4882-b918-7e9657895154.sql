-- Fix MIME types for documents based on file extensions
UPDATE documents 
SET mime_type = 'application/pdf' 
WHERE lower(file_url) LIKE '%.pdf' 
  AND mime_type NOT LIKE 'application/%'
  AND mime_type NOT LIKE 'image/%';

UPDATE documents 
SET mime_type = 'image/png' 
WHERE lower(file_url) LIKE '%.png' 
  AND mime_type NOT LIKE 'image/%';

UPDATE documents 
SET mime_type = 'image/jpeg' 
WHERE (lower(file_url) LIKE '%.jpg' OR lower(file_url) LIKE '%.jpeg')
  AND mime_type NOT LIKE 'image/%';

-- Set default source for existing documents without one
UPDATE documents 
SET source = 'manual' 
WHERE source IS NULL;