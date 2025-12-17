-- Create email_categories table for user-defined email organization
CREATE TABLE email_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_uid INTEGER NOT NULL,
  email_folder VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('needs_attention', 'reviewed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for quick lookups
CREATE UNIQUE INDEX idx_email_categories_uid_folder ON email_categories(email_uid, email_folder);
CREATE INDEX idx_email_categories_category ON email_categories(category);

-- Enable RLS
ALTER TABLE email_categories ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to manage email categories
CREATE POLICY "Allow all for authenticated" ON email_categories 
  FOR ALL USING (true) WITH CHECK (true);