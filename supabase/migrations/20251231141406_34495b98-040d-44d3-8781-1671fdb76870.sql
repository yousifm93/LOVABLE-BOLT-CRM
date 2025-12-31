-- Add item_index column to track which specific feedback item a comment is for
ALTER TABLE team_feedback_comments 
ADD COLUMN item_index integer;

-- Add a comment explaining the column
COMMENT ON COLUMN team_feedback_comments.item_index IS 'Index of the specific feedback item within the feedback_items array (0-based). NULL means comment applies to entire feedback section.';