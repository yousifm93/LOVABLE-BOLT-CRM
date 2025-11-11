-- Configure the documents storage bucket with proper settings
-- Using ON CONFLICT to handle case where bucket already exists
INSERT INTO storage.buckets (
  id, 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types
)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket - requires signed URLs for access
  10485760,  -- 10MB file size limit (10 * 1024 * 1024 bytes)
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) 
DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  updated_at = NOW();