-- Fix execute_disclosure_status_changed_automations - remove broken UPDATE to non-existent columns
CREATE OR REPLACE FUNCTION execute_disclosure_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE borrower_id = NEW.id 
      AND automation_id = automation_record.id
      AND task_status != 'Archived'
    ) THEN
      -- Create the task and capture its ID
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        task_status,
        task_priority,
        due_date,
        assigned_to,
        automation_id,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation_record.task_name,
        automation_record.task_description,
        NEW.id,
        'To Do',
        COALESCE(automation_record.task_priority, 'Medium'),
        v_due_date,
        automation_record.assigned_to_user_id,
        automation_record.id,
        v_user_id,
        automation_record.completion_requirement_type
      ) RETURNING id INTO v_task_id;
      
      -- REMOVED: The broken UPDATE to task_automations (columns don't exist)
      
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
$$;

-- Fix execute_loan_status_changed_automations - remove broken UPDATE to non-existent columns
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE borrower_id = NEW.id 
      AND automation_id = automation_record.id
      AND task_status != 'Archived'
    ) THEN
      -- Create the task and capture its ID
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        task_status,
        task_priority,
        due_date,
        assigned_to,
        automation_id,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation_record.task_name,
        automation_record.task_description,
        NEW.id,
        'To Do',
        COALESCE(automation_record.task_priority, 'Medium'),
        v_due_date,
        automation_record.assigned_to_user_id,
        automation_record.id,
        v_user_id,
        automation_record.completion_requirement_type
      ) RETURNING id INTO v_task_id;
      
      -- REMOVED: The broken UPDATE to task_automations (columns don't exist)
      
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
$$;