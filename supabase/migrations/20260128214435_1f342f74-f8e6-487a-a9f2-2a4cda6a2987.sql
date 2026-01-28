-- Add account column to email_categories for multi-account isolation
ALTER TABLE email_categories ADD COLUMN IF NOT EXISTS account VARCHAR(50) DEFAULT 'yousif';

-- Update existing records to 'yousif' (since all were created before multi-account)
UPDATE email_categories SET account = 'yousif' WHERE account IS NULL;