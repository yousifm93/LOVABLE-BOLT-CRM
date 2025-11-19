-- Update task automation to set due date to today by default
DROP FUNCTION IF EXISTS public.execute_lead_created_automations() CASCADE;

CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
BEGIN
  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    INSERT INTO public.tasks (
      borrower_id,
      title,
      description,
      assignee_id,
      priority,
      due_date,
      status,
      created_by
    ) VALUES (
      NEW.id,
      automation.task_name,
      automation.task_description,
      automation.assigned_to_user_id,
      automation.task_priority::task_priority,
      CASE 
        WHEN automation.due_date_offset_days IS NOT NULL 
        THEN CURRENT_DATE + automation.due_date_offset_days
        ELSE CURRENT_DATE
      END,
      'To Do'::task_status,
      NEW.created_by
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER trigger_execute_lead_created_automations
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_lead_created_automations();