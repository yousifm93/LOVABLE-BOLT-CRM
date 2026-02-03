-- Fix all 4 trigger functions to use correct column names (assignee_id instead of assigned_to)
-- Also handle the "Add Approval Conditions" automation safely and rename "Intro call"

-- 1. Fix execute_loan_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
  actual_assignee_id uuid;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'loan_status'
        AND (ta.trigger_config->>'target_status')::text = NEW.loan_status::text
    LOOP
      -- Check for existing non-done task to prevent duplicates
      IF NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.borrower_id = NEW.id
          AND t.title = automation_record.task_name
          AND t.status::text NOT IN ('Done')
      ) THEN
        -- Determine assignee with fallback
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
        
        -- Create the task with correct column names
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
        
        -- Log the execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          now()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
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
        AND (ta.trigger_config->>'target_status')::text = NEW.disclosure_status::text
    LOOP
      -- Check for existing non-done task to prevent duplicates
      IF NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.borrower_id = NEW.id
          AND t.title = automation_record.task_name
          AND t.status::text NOT IN ('Done')
      ) THEN
        -- Determine assignee with fallback
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
        
        -- Create the task with correct column names
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
        
        -- Log the execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          now()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
  actual_assignee_id uuid;
BEGIN
  -- Only proceed if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'stage_changed'
        AND (ta.trigger_config->>'field')::text = 'pipeline_stage'
        AND (ta.trigger_config->>'target_status')::text = NEW.pipeline_stage::text
    LOOP
      -- Check for existing non-done task to prevent duplicates
      IF NOT EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.borrower_id = NEW.id
          AND t.title = automation_record.task_name
          AND t.status::text NOT IN ('Done')
      ) THEN
        -- Determine assignee with fallback
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
        
        -- Create the task with correct column names
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
        
        -- Log the execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          now()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Fix execute_lead_created_automations
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
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
        AND t.title = automation_record.task_name
        AND t.status::text NOT IN ('Done')
    ) THEN
      -- Determine assignee with fallback
      actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
      
      -- Create the task with correct column names
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
      
      -- Log the execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        executed_at
      ) VALUES (
        automation_record.id,
        NEW.id,
        new_task_id,
        now()
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Delete execution log rows for the automation we want to remove (cannot set NULL due to NOT NULL constraint)
DELETE FROM public.task_automation_executions 
WHERE automation_id = '32b81e94-c806-437a-97cb-4eb788f8798e';

-- 6. Remove FK reference from tasks table
UPDATE public.tasks 
SET automation_id = NULL 
WHERE automation_id = '32b81e94-c806-437a-97cb-4eb788f8798e';

-- 7. Now safely delete the "Add Approval Conditions" automation
DELETE FROM public.task_automations WHERE id = '32b81e94-c806-437a-97cb-4eb788f8798e';

-- 8. Rename the intro call automation to "Intro Call (Borrower)"
UPDATE public.task_automations 
SET 
  name = 'Intro Call (Borrower)',
  task_name = 'Intro Call (Borrower)',
  updated_at = now()
WHERE id = '24061f78-0c74-4ca3-8227-afee9f015de0';