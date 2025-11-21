-- Phase 2.2: Update all task creation functions to include completion_requirement_type

-- Update execute_lead_created_automations
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id UUID;
BEGIN
  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    BEGIN
      INSERT INTO public.tasks (
        borrower_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        completion_requirement_type
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
        'Working on it'::task_status,
        NEW.created_by,
        COALESCE(automation.completion_requirement_type, 'none')
      )
      RETURNING id INTO new_task_id;
      
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
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Update execute_appraisal_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id UUID;
  target_status TEXT;
BEGIN
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    FOR automation IN 
      SELECT * FROM public.task_automations 
      WHERE trigger_type = 'status_changed' 
        AND is_active = true
        AND (trigger_config->>'field')::text = 'appraisal_status'
    LOOP
      target_status := (automation.trigger_config->>'target_status')::text;
      
      IF NEW.appraisal_status::text = target_status THEN
        BEGIN
          INSERT INTO public.tasks (
            borrower_id,
            title,
            description,
            assignee_id,
            priority,
            status,
            due_date,
            created_at,
            completion_requirement_type
          ) VALUES (
            NEW.id,
            automation.task_name,
            automation.task_description,
            automation.assigned_to_user_id,
            automation.task_priority::task_priority,
            'Working on it'::task_status,
            CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
            now(),
            COALESCE(automation.completion_requirement_type, 'none')
          )
          RETURNING id INTO new_task_id;
          
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
$function$;