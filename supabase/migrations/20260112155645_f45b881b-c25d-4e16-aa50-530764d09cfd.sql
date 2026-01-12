-- Fix 1: Update execute_close_date_changed_automations to skip conditional automations
CREATE OR REPLACE FUNCTION public.execute_close_date_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  IF OLD.close_date IS DISTINCT FROM NEW.close_date AND NEW.disclosure_status = 'Signed' THEN
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE is_active = true 
        AND trigger_type = 'status_changed' 
        AND trigger_config->>'field' = 'close_date'
        AND (trigger_config->>'condition') IS NULL  -- Skip conditional automations like extend_rate_lock
    LOOP
      BEGIN
        INSERT INTO public.tasks (
          title, description, borrower_id, assignee_id, priority, 
          due_date, status, created_by, completion_requirement_type
        )
        VALUES (
          automation.task_name, 
          automation.task_description, 
          NEW.id, 
          automation.assigned_to_user_id,
          automation.task_priority::task_priority, 
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it', 
          automation.created_by, 
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;
        
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation.id, NEW.id, NULL, NOW(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

-- Fix 2: Update execute_extend_rate_lock_automation with better duplicate detection
CREATE OR REPLACE FUNCTION public.execute_extend_rate_lock_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  lead_assignee uuid;
BEGIN
  -- Only run if close_date was updated and conditions are met
  IF OLD.close_date IS DISTINCT FROM NEW.close_date 
     AND NEW.close_date IS NOT NULL 
     AND NEW.lock_expiration_date IS NOT NULL 
     AND NEW.disclosure_status = 'Signed'
     AND NEW.close_date > NEW.lock_expiration_date THEN
    
    lead_assignee := NEW.teammate_assigned;
    
    -- Better duplicate check - look for any "Extend Rate Lock" task (case insensitive)
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE borrower_id = NEW.id 
        AND (title = 'Extend Rate Lock' OR title ILIKE '%extend rate lock%')
        AND deleted_at IS NULL
        AND status != 'Done'
    ) THEN
      -- Get the automation config for consistent task creation
      SELECT * INTO automation FROM public.task_automations
      WHERE name = 'Extend Rate Lock' AND is_active = true
      LIMIT 1;
      
      IF automation.id IS NOT NULL THEN
        INSERT INTO public.tasks (
          title, description, borrower_id, assignee_id, 
          priority, due_date, status, completion_requirement_type
        ) VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          COALESCE(automation.assigned_to_user_id, lead_assignee),
          COALESCE(automation.task_priority, 'High'),
          CURRENT_DATE,
          'Working on it',
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;
        
        -- Log the execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;