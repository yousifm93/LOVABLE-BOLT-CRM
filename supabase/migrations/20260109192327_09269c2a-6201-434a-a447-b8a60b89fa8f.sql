-- Add updated_by column to track who last modified the task
ALTER TABLE tasks ADD COLUMN updated_by uuid REFERENCES users(id);

-- Create trigger to automatically set updated_by on update
CREATE OR REPLACE FUNCTION set_task_updated_by()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by := get_current_crm_user_id();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_task_updated_by
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_updated_by();