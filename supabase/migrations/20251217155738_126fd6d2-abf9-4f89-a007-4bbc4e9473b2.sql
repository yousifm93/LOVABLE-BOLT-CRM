-- Drop the existing constraint FIRST
ALTER TABLE email_categories DROP CONSTRAINT IF EXISTS email_categories_category_check;

-- Update existing 'reviewed' rows to 'reviewed_na' as default
UPDATE email_categories SET category = 'reviewed_na' WHERE category = 'reviewed';

-- Add new constraint with expanded categories
ALTER TABLE email_categories ADD CONSTRAINT email_categories_category_check 
  CHECK (category IN (
    'needs_attention', 
    'reviewed_file', 
    'reviewed_lender_marketing', 
    'reviewed_na'
  ));