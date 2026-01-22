-- Allow authenticated users to read borrower_tasks
CREATE POLICY "Authenticated users can read borrower_tasks"
ON borrower_tasks FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read borrower_documents
CREATE POLICY "Authenticated users can read borrower_documents"
ON borrower_documents FOR SELECT
TO authenticated
USING (true);