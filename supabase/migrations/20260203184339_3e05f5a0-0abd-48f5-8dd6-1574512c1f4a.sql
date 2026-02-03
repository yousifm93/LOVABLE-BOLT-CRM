-- Fix trigger functions that reference wrong column name
-- The tasks table has 'status' column, not 'task_status'

-- Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION execute_disclosure_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_due_date date;
  v_task_id uuid;
BEGIN
  -- Get the auth user ID
  v_auth_user_id := auth.uid();
  
  -- Map auth user to public user
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = v_auth_user_id;
  
  -- Check for disclosure_status change automations
  FOR automation_record IN
    SELECT * FROM task_automations 
    WHERE is_active = true 
    AND trigger_type = 'status_changed'
    AND trigger_config->>'field' = 'disclosure_status'
    AND trigger_config->>'target_status' = NEW.disclosure_status::text
    AND (
      -- No additional condition
      trigger_config->>'condition_field' IS NULL
      OR (
        -- Has additional condition - check if it matches
        trigger_config->>'condition_field' = 'property_type'
        AND NEW.property_type::text ILIKE '%' || (trigger_config->>'condition_value')::text || '%'
      )
    )
  LOOP
    -- Calculate due date
    v_due_date := CURRENT_DATE + COALESCE((automation_record.due_date_offset_days)::integer, 0);
    
    -- Check if task already exists for this lead and automation
    -- FIXED: Use 'status' instead of 'task_status'
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE borrower_id = NEW.id 
      AND automation_id = automation_record.id
      AND status != 'Archived'
    ) THEN
      -- Create the task and capture its ID
      -- FIXED: Use 'status' instead of 'task_status', 'priority' instead of 'task_priority'
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        status,
        priority,
        due_date,
        assignee_id,
        automation_id,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation_record.task_name,
        automation_record.task_description,
        NEW.id,
        'To Do',
        COALESCE(automation_record.task_priority, 'Medium')::task_priority,
        v_due_date,
        automation_record.assigned_to_user_id,
        automation_record.id,
        v_user_id,
        automation_record.completion_requirement_type
      ) RETURNING id INTO v_task_id;
      
      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        triggered_by_field,
        triggered_by_value,
        success
      ) VALUES (
        automation_record.id,
        NEW.id,
        v_task_id,
        'disclosure_status',
        NEW.disclosure_status::text,
        true
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix execute_loan_status_changed_automations
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_due_date date;
  v_task_id uuid;
BEGIN
  -- Get the auth user ID
  v_auth_user_id := auth.uid();
  
  -- Map auth user to public user
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = v_auth_user_id;
  
  -- Check for loan_status change automations
  FOR automation_record IN
    SELECT * FROM task_automations 
    WHERE is_active = true 
    AND trigger_type = 'status_changed'
    AND trigger_config->>'field' = 'loan_status'
    AND trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    -- Calculate due date
    v_due_date := CURRENT_DATE + COALESCE((automation_record.due_date_offset_days)::integer, 0);
    
    -- Check if task already exists for this lead and automation
    -- FIXED: Use 'status' instead of 'task_status'
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE borrower_id = NEW.id 
      AND automation_id = automation_record.id
      AND status != 'Archived'
    ) THEN
      -- Create the task and capture its ID
      -- FIXED: Use 'status' instead of 'task_status', 'priority' instead of 'task_priority'
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        status,
        priority,
        due_date,
        assignee_id,
        automation_id,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation_record.task_name,
        automation_record.task_description,
        NEW.id,
        'To Do',
        COALESCE(automation_record.task_priority, 'Medium')::task_priority,
        v_due_date,
        automation_record.assigned_to_user_id,
        automation_record.id,
        v_user_id,
        automation_record.completion_requirement_type
      ) RETURNING id INTO v_task_id;
      
      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        triggered_by_field,
        triggered_by_value,
        success
      ) VALUES (
        automation_record.id,
        NEW.id,
        v_task_id,
        'loan_status',
        NEW.loan_status::text,
        true
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION execute_pipeline_stage_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
  v_assignee_id uuid;
BEGIN
  -- Get auth user and map to CRM user
  v_user_id := auth.uid();
  SELECT id INTO v_crm_user_id FROM public.users WHERE auth_user_id = v_user_id LIMIT 1;

  -- Only process if pipeline_section changed and new value is 'Active'
  IF NEW.pipeline_section IS DISTINCT FROM OLD.pipeline_section 
     AND NEW.pipeline_section = 'Active' THEN
    
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'pipeline_stage_changed'
        AND trigger_config->>'target_stage' = 'Active'
    LOOP
      BEGIN
        -- Assignee: automation setting, then lead teammate, then creator
        v_assignee_id := COALESCE(
          automation.assigned_to_user_id,
          NEW.teammate_assigned,
          v_crm_user_id
        );
        
        -- Check if task already exists for this lead and automation
        -- FIXED: Use 'status' instead of 'task_status'
        IF NOT EXISTS (
          SELECT 1 FROM tasks 
          WHERE borrower_id = NEW.id 
          AND automation_id = automation.id
          AND status != 'Archived'
        ) THEN
          INSERT INTO public.tasks (
            id, title, description, status, priority,
            assignee_id, due_date, created_by, borrower_id, automation_id,
            completion_requirement_type
          )
          VALUES (
            gen_random_uuid(),
            automation.task_name,
            automation.task_description,
            'To Do',
            COALESCE(automation.task_priority, 'Medium')::task_priority,
            v_assignee_id,
            CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
            v_crm_user_id,
            NEW.id,
            automation.id,
            automation.completion_requirement_type
          )
          RETURNING id INTO new_task_id;
          
          -- Log successful execution
          INSERT INTO public.task_automation_executions (
            automation_id, lead_id, task_id, executed_at, success
          ) VALUES (
            automation.id, NEW.id, new_task_id, NOW(), true
          );
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
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
$$ LANGUAGE plpgsql SECURITY DEFINER;