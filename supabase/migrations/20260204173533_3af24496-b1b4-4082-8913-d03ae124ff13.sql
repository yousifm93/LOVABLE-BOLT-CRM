-- Comprehensive Task Automation Fixes
-- 1. Case-insensitive matching for all triggers
-- 2. Fixed column names (task_name instead of task_title)
-- 3. Correct leads table column for assignment (teammate_assigned)

-- 1. Fixed execute_lead_created_automations
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- YM
  actual_assignee_id uuid;
BEGIN
  FOR automation_record IN
    SELECT ta.* 
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'lead_created'
  LOOP
    -- Check for existing non-done task to prevent duplicates
    IF NOT EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND (t.automation_id = automation_record.id OR t.title = automation_record.task_name)
        AND t.status::text NOT IN ('Done')
        AND t.deleted_at IS NULL
    ) THEN
      -- Determine assignee with fallback
      actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
      
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        assignee_id,
        status,
        priority,
        due_date,
        automation_id
      ) VALUES (
        automation_record.task_name,
        automation_record.task_description,
        NEW.id,
        actual_assignee_id,
        'To Do'::task_status,
        COALESCE(automation_record.task_priority, 'Medium')::task_priority,
        CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval,
        automation_record.id
      )
      RETURNING id INTO new_task_id;
      
      INSERT INTO task_automation_executions (
        automation_id, lead_id, task_id, executed_at, success
      ) VALUES (
        automation_record.id, NEW.id, new_task_id, now(), true
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 2. Fixed execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    automation RECORD;
    new_stage_name TEXT;
    task_due DATE;
    task_assignee_id UUID;
    new_task_id UUID;
    fallback_user_id UUID := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- YM
BEGIN
    -- Only run if pipeline_stage_id actually changed
    IF OLD.pipeline_stage_id IS NOT DISTINCT FROM NEW.pipeline_stage_id THEN
        RETURN NEW;
    END IF;
    
    -- Look up stage names from pipeline_stages table
    SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.pipeline_stage_id;
    
    -- Find matching automations (case-insensitive)
    FOR automation IN 
        SELECT ta.* 
        FROM public.task_automations ta
        WHERE ta.trigger_type = 'status_changed'
          AND ta.is_active = true
          AND upper((ta.trigger_config->>'target_status')::text) = upper(new_stage_name::text)
    LOOP
        -- Calculate due date
        task_due := CURRENT_DATE + COALESCE((automation.trigger_config->>'due_days')::int, 0);
        
        -- Get assignee - use automation config or fallback
        task_assignee_id := COALESCE(
            automation.assigned_to_user_id,
            NEW.teammate_assigned,
            fallback_user_id
        );
        
        -- Check for duplicate
        IF NOT EXISTS (
            SELECT 1 FROM public.tasks
            WHERE borrower_id = NEW.id
              AND (automation_id = automation.id OR title = automation.task_name)
              AND status::text NOT IN ('Done')
              AND deleted_at IS NULL
        ) THEN
            -- Insert new task
            INSERT INTO public.tasks (
                title,
                description,
                borrower_id,
                assignee_id,
                due_date,
                priority,
                status,
                automation_id,
                created_at,
                updated_at
            ) VALUES (
                automation.task_name,
                automation.task_description,
                NEW.id,
                task_assignee_id,
                task_due,
                COALESCE(automation.task_priority, 'Medium')::task_priority,
                'To Do'::task_status,
                automation.id,
                NOW(),
                NOW()
            )
            RETURNING id INTO new_task_id;
            
            -- Log execution
            INSERT INTO public.task_automation_executions (
                automation_id, lead_id, task_id, executed_at, success
            ) VALUES (
                automation.id, NEW.id, new_task_id, NOW(), true
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$function$;

-- 3. Fixed execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- YM
  actual_assignee_id uuid;
BEGIN
  -- Only proceed if disclosure_status actually changed
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'disclosure_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.disclosure_status::text)
    LOOP
      -- Check for duplicate
      IF NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.borrower_id = NEW.id
          AND (t.automation_id = automation_record.id OR t.title = automation_record.task_name)
          AND t.status::text NOT IN ('Done')
          AND t.deleted_at IS NULL
      ) THEN
        -- Determine assignee with fallback
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
        
        INSERT INTO tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          status,
          priority,
          due_date,
          automation_id
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          NEW.id,
          actual_assignee_id,
          'To Do'::task_status,
          COALESCE(automation_record.task_priority, 'Medium')::task_priority,
          CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval,
          automation_record.id
        )
        RETURNING id INTO new_task_id;
        
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation_record.id, NEW.id, new_task_id, now(), true
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;