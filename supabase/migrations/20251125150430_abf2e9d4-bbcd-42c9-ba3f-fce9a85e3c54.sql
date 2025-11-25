-- Phase 5: Add database triggers to auto-log condition status changes

-- Function to log status changes
CREATE OR REPLACE FUNCTION log_condition_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO lead_condition_status_history (condition_id, status, changed_by)
    VALUES (NEW.id, NEW.status, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for status changes
CREATE TRIGGER tr_log_condition_status_change
  AFTER UPDATE OF status ON lead_conditions
  FOR EACH ROW
  EXECUTE FUNCTION log_condition_status_change();

-- Function to log initial status when condition is created
CREATE OR REPLACE FUNCTION log_condition_initial_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO lead_condition_status_history (condition_id, status, changed_by)
  VALUES (NEW.id, NEW.status, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for initial status
CREATE TRIGGER tr_log_condition_initial_status
  AFTER INSERT ON lead_conditions
  FOR EACH ROW
  EXECUTE FUNCTION log_condition_initial_status();