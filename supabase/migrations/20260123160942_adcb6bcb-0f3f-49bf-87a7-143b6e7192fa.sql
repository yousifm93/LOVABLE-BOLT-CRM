-- Add new column for sidebar pipeline expansion default
ALTER TABLE user_permissions 
ADD COLUMN IF NOT EXISTS sidebar_pipeline_expanded_default BOOLEAN DEFAULT false;

-- Update Ashley's permissions: landing page to Home and pipeline expanded by default
UPDATE user_permissions 
SET 
  default_landing_page = '/',
  sidebar_pipeline_expanded_default = true
WHERE user_id = '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a';