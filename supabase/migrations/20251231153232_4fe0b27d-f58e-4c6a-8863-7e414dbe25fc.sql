-- Create storage bucket for feedback attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for authenticated users to upload
CREATE POLICY "Authenticated users can upload feedback attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'feedback-attachments' AND auth.role() = 'authenticated');

-- Create storage policies for anyone to view
CREATE POLICY "Anyone can view feedback attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'feedback-attachments');

-- Create storage policies for owners to delete
CREATE POLICY "Users can delete their own feedback attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'feedback-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);