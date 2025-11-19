-- Fix type casting in appraisal status changed automations trigger
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  target_status TEXT;
BEGIN
  -- Only proceed if appraisal_status actually changed
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    
    -- Loop through all active status_changed automations for appraisal_status
    FOR automation IN 
      SELECT * FROM public.task_automations 
      WHERE trigger_type = 'status_changed' 
        AND is_active = true
        AND (trigger_config->>'field')::text = 'appraisal_status'
    LOOP
      -- Get the target status from trigger_config
      target_status := (automation.trigger_config->>'target_status')::text;
      
      -- Check if the new status matches the target status
      IF NEW.appraisal_status::text = target_status THEN
        BEGIN
          -- Create the task
          INSERT INTO public.tasks (
            borrower_id,
            title,
            description,
            assignee_id,
            priority,
            status,
            due_date,
            created_at
          ) VALUES (
            NEW.id,
            automation.task_name,
            automation.task_description,
            automation.assigned_to_user_id,
            automation.task_priority::task_priority,
            'Working on it'::task_status,
            CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
            now()
          )
          RETURNING id INTO new_task_id;
          
          -- Log successful execution
          INSERT INTO public.task_automation_executions (
            automation_id,
            lead_id,
            task_id,
            success
          ) VALUES (
            automation.id,
            NEW.id,
            new_task_id,
            true
          );
          
        EXCEPTION WHEN OTHERS THEN
          -- Log failed execution
          INSERT INTO public.task_automation_executions (
            automation_id,
            lead_id,
            task_id,
            success,
            error_message
          ) VALUES (
            automation.id,
            NEW.id,
            NULL,
            false,
            SQLERRM
          );
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;