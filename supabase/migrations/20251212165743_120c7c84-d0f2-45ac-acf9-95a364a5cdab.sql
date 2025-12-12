-- Create a trigger function to detect when close_date > lock_expiration_date and create a task
CREATE OR REPLACE FUNCTION public.execute_extend_rate_lock_automation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  lead_assignee uuid;
BEGIN
  -- Only run if close_date was updated and lock_expiration_date exists
  IF OLD.close_date IS DISTINCT FROM NEW.close_date 
     AND NEW.close_date IS NOT NULL 
     AND NEW.lock_expiration_date IS NOT NULL 
     AND NEW.close_date > NEW.lock_expiration_date THEN
    
    -- Get the assignee from the lead
    lead_assignee := NEW.teammate_assigned;
    
    -- Check if a task for this already exists (prevent duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE borrower_id = NEW.id 
        AND title ILIKE '%extend rate lock%'
        AND deleted_at IS NULL
        AND status != 'Done'
    ) THEN
      -- Create the task
      INSERT INTO public.tasks (
        title, 
        description, 
        borrower_id, 
        assignee_id, 
        priority, 
        due_date, 
        status, 
        completion_requirement_type
      ) VALUES (
        'Extend Rate Lock - Closing Date Past Lock Expiration',
        'The closing date has been pushed past the rate lock expiration date. Contact lender to extend the rate lock immediately.',
        NEW.id,
        lead_assignee,
        'High',
        CURRENT_DATE, -- Due today
        'Working on it',
        'none'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on leads table
DROP TRIGGER IF EXISTS trigger_extend_rate_lock ON public.leads;
CREATE TRIGGER trigger_extend_rate_lock
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_extend_rate_lock_automation();