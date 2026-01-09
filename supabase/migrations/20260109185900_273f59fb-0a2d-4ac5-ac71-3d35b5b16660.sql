-- Update the check constraint to include the new status
ALTER TABLE team_feedback_item_status DROP CONSTRAINT IF EXISTS team_feedback_item_status_status_check;
ALTER TABLE team_feedback_item_status ADD CONSTRAINT team_feedback_item_status_status_check 
  CHECK (status = ANY (ARRAY['pending', 'complete', 'needs_help', 'idea', 'pending_user_review']));

-- Also update agent_call_logs to allow broker_open
ALTER TABLE agent_call_logs DROP CONSTRAINT IF EXISTS agent_call_logs_log_type_check;
ALTER TABLE agent_call_logs ADD CONSTRAINT agent_call_logs_log_type_check 
  CHECK (log_type = ANY (ARRAY['call', 'meeting', 'broker_open']));