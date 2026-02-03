-- Fix duplicate key error on task_assignees during pipeline stage transitions
-- The issue occurs when task automations create tasks with assignee_id and client code
-- tries to also sync task_assignees, causing race conditions

-- Create a function to safely insert task_assignees without duplicate errors
CREATE OR REPLACE FUNCTION safe_insert_task_assignee(
  p_task_id UUID,
  p_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO task_assignees (task_id, user_id)
  VALUES (p_task_id, p_user_id)
  ON CONFLICT (task_id, user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;