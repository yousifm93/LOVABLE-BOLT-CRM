-- Create task_change_logs table to track what was changed
CREATE TABLE public.task_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookups by task
CREATE INDEX idx_task_change_logs_task_id ON public.task_change_logs(task_id);
CREATE INDEX idx_task_change_logs_created_at ON public.task_change_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.task_change_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read
CREATE POLICY "Authenticated users can read task change logs"
  ON public.task_change_logs FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger function to log task changes
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := public.get_current_crm_user_id();
  
  -- Check each trackable field for changes
  IF OLD.title IS DISTINCT FROM NEW.title THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Title', OLD.title, NEW.title, current_user_id);
  END IF;
  
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Status', OLD.status, NEW.status, current_user_id);
  END IF;
  
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Priority', OLD.priority::text, NEW.priority::text, current_user_id);
  END IF;
  
  IF OLD.notes IS DISTINCT FROM NEW.notes THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Notes', 
      CASE WHEN OLD.notes IS NULL THEN '(empty)' ELSE LEFT(OLD.notes, 50) END,
      CASE WHEN NEW.notes IS NULL THEN '(empty)' ELSE LEFT(NEW.notes, 50) END,
      current_user_id);
  END IF;
  
  IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Due Date', 
      COALESCE(TO_CHAR(OLD.due_date, 'Mon DD, YYYY'), '(none)'),
      COALESCE(TO_CHAR(NEW.due_date, 'Mon DD, YYYY'), '(none)'),
      current_user_id);
  END IF;
  
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Assigned To',
      (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = OLD.assignee_id),
      (SELECT CONCAT(first_name, ' ', last_name) FROM public.users WHERE id = NEW.assignee_id),
      current_user_id);
  END IF;
  
  IF OLD.reviewed IS DISTINCT FROM NEW.reviewed THEN
    INSERT INTO public.task_change_logs (task_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'Reviewed',
      CASE WHEN OLD.reviewed THEN 'Yes' ELSE 'No' END,
      CASE WHEN NEW.reviewed THEN 'Yes' ELSE 'No' END,
      current_user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger (runs AFTER update)
CREATE TRIGGER trigger_log_task_changes
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_changes();