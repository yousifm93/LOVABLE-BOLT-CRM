-- Create the lead-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lead-documents',
  'lead-documents',
  false,
  52428800,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload lead documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'lead-documents');

-- Allow authenticated users to read files
CREATE POLICY "Authenticated users can read lead documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'lead-documents');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete lead documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'lead-documents');