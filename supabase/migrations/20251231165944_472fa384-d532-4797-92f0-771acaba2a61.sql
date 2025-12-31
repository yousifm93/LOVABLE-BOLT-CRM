-- Fix: Add 'idea' to the team_feedback_item_status check constraint
ALTER TABLE team_feedback_item_status 
  DROP CONSTRAINT IF EXISTS team_feedback_item_status_status_check;

ALTER TABLE team_feedback_item_status 
  ADD CONSTRAINT team_feedback_item_status_status_check 
  CHECK (status IN ('pending', 'complete', 'needs_help', 'idea'));