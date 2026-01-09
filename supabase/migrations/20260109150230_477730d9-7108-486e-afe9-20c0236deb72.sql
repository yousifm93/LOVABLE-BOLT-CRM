-- Add new columns for tracking read status
ALTER TABLE team_feedback
ADD COLUMN IF NOT EXISTS is_read_by_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_response_read_by_user BOOLEAN DEFAULT true;

-- Drop the unique constraint to allow multiple feedback items per section per user
ALTER TABLE team_feedback DROP CONSTRAINT IF EXISTS team_feedback_user_id_section_key_key;

-- Update existing feedback to be marked as read by admin (since they're existing)
UPDATE team_feedback SET is_read_by_admin = true WHERE is_read_by_admin = false;