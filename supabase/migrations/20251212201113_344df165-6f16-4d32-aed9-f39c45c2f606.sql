-- Create storage bucket for income documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('income-docs', 'income-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy to allow authenticated users to upload
CREATE POLICY "Authenticated users can upload income docs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'income-docs' AND auth.role() = 'authenticated');

-- Create storage policy to allow authenticated users to read
CREATE POLICY "Authenticated users can read income docs"
ON storage.objects FOR SELECT
USING (bucket_id = 'income-docs' AND auth.role() = 'authenticated');

-- Create storage policy to allow authenticated users to delete
CREATE POLICY "Authenticated users can delete income docs"
ON storage.objects FOR DELETE
USING (bucket_id = 'income-docs' AND auth.role() = 'authenticated');