-- Enable RLS on documents table if not already enabled
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view documents for their account leads" ON documents;
DROP POLICY IF EXISTS "Users can insert documents for their account leads" ON documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON documents;

-- Allow users to view documents for leads in their account
CREATE POLICY "Users can view documents for their account leads"
ON documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = documents.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

-- Allow users to insert documents for leads in their account
CREATE POLICY "Users can insert documents for their account leads"
ON documents FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = documents.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

-- Allow users to delete their own uploaded documents
CREATE POLICY "Users can delete their own documents"
ON documents FOR DELETE
USING (uploaded_by = auth.uid());

-- Storage bucket policies for documents bucket
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to their lead folders" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents for their account leads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;

-- Allow authenticated users to upload to documents bucket
CREATE POLICY "Users can upload to their lead folders"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to view documents
CREATE POLICY "Users can view documents for their account leads"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their uploads
CREATE POLICY "Users can delete their uploads"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' 
  AND auth.role() = 'authenticated'
);