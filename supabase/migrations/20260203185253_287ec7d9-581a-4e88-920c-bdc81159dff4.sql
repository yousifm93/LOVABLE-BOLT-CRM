-- Fix all 4 trigger functions with correct column names matching the actual schema

-- 1. Fix execute_loan_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  resolved_assignee_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
BEGIN
  -- Only run if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status AND NEW.loan_status IS NOT NULL THEN
    
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'loan_status'
        AND (ta.trigger_config->>'target_status')::text = NEW.loan_status::text
    LOOP
      -- Resolve assignee: use automation's assigned_to_user_id or fallback
      resolved_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
      
      -- Check if task already exists (prevent duplicates)
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
        AND automation_id = automation_record.id
        AND status::text NOT IN ('Done')
      ) THEN
        -- Create the task
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          borrower_id,
          assigned_to,
          due_date,
          automation_id,
          created_by
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          'To Do'::task_status,
          COALESCE(automation_record.priority, 'Medium'),
          NEW.id,
          resolved_assignee_id,
          CURRENT_DATE,
          automation_record.id,
          resolved_assignee_id
        )
        RETURNING id INTO new_task_id;
        
        -- Log the execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          trigger_data
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          NOW(),
          true,
          jsonb_build_object('old_status', OLD.loan_status::text, 'new_status', NEW.loan_status::text)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  resolved_assignee_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
BEGIN
  -- Only run if disclosure_status actually changed
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status AND NEW.disclosure_status IS NOT NULL THEN
    
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'disclosure_status'
        AND (ta.trigger_config->>'target_status')::text = NEW.disclosure_status::text
    LOOP
      -- Resolve assignee
      resolved_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
      
      -- Check if task already exists
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
        AND automation_id = automation_record.id
        AND status::text NOT IN ('Done')
      ) THEN
        -- Create the task
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          borrower_id,
          assigned_to,
          due_date,
          automation_id,
          created_by
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          'To Do'::task_status,
          COALESCE(automation_record.priority, 'Medium'),
          NEW.id,
          resolved_assignee_id,
          CURRENT_DATE,
          automation_record.id,
          resolved_assignee_id
        )
        RETURNING id INTO new_task_id;
        
        -- Log the execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          trigger_data
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          NOW(),
          true,
          jsonb_build_object('old_status', OLD.disclosure_status::text, 'new_status', NEW.disclosure_status::text)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 3. Fix execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  resolved_assignee_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
BEGIN
  -- Only run if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage AND NEW.pipeline_stage IS NOT NULL THEN
    
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'pipeline_stage'
        AND (ta.trigger_config->>'target_status')::text = NEW.pipeline_stage::text
    LOOP
      -- Resolve assignee
      resolved_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
      
      -- Check if task already exists
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
        AND automation_id = automation_record.id
        AND status::text NOT IN ('Done')
      ) THEN
        -- Create the task
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          borrower_id,
          assigned_to,
          due_date,
          automation_id,
          created_by
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          'To Do'::task_status,
          COALESCE(automation_record.priority, 'Medium'),
          NEW.id,
          resolved_assignee_id,
          CURRENT_DATE,
          automation_record.id,
          resolved_assignee_id
        )
        RETURNING id INTO new_task_id;
        
        -- Log the execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          trigger_data
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          NOW(),
          true,
          jsonb_build_object('old_stage', OLD.pipeline_stage::text, 'new_stage', NEW.pipeline_stage::text)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Fix execute_lead_created_automations
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  resolved_assignee_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
BEGIN
  FOR automation_record IN
    SELECT ta.* 
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'lead_created'
  LOOP
    -- Resolve assignee
    resolved_assignee_id := COALESCE(automation_record.assigned_to_user_id, fallback_user_id);
    
    -- Create the task
    INSERT INTO tasks (
      title,
      description,
      status,
      priority,
      borrower_id,
      assigned_to,
      due_date,
      automation_id,
      created_by
    ) VALUES (
      automation_record.task_name,
      automation_record.task_description,
      'To Do'::task_status,
      COALESCE(automation_record.priority, 'Medium'),
      NEW.id,
      resolved_assignee_id,
      CURRENT_DATE,
      automation_record.id,
      resolved_assignee_id
    )
    RETURNING id INTO new_task_id;
    
    -- Log the execution
    INSERT INTO task_automation_executions (
      automation_id,
      lead_id,
      task_id,
      executed_at,
      success,
      trigger_data
    ) VALUES (
      automation_record.id,
      NEW.id,
      new_task_id,
      NOW(),
      true,
      jsonb_build_object('trigger', 'lead_created')
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;