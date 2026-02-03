-- Fix type casting in all status trigger functions to prevent "operator does not exist" errors

-- 1. Fix the disclosure_status trigger function
CREATE OR REPLACE FUNCTION execute_disclosure_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_due_date date;
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
      -- Create the task
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
      );
      
      -- Update execution count
      UPDATE task_automations 
      SET execution_count = COALESCE(execution_count, 0) + 1,
          last_run_at = now()
      WHERE id = automation_record.id;
      
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
        (SELECT id FROM tasks WHERE borrower_id = NEW.id AND automation_id = automation_record.id ORDER BY created_at DESC LIMIT 1),
        'disclosure_status',
        NEW.disclosure_status::text,
        true
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix the loan_status trigger function
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_due_date date;
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
      -- Create the task
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
      );
      
      -- Update execution count
      UPDATE task_automations 
      SET execution_count = COALESCE(execution_count, 0) + 1,
          last_run_at = now()
      WHERE id = automation_record.id;
      
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
        (SELECT id FROM tasks WHERE borrower_id = NEW.id AND automation_id = automation_record.id ORDER BY created_at DESC LIMIT 1),
        'loan_status',
        NEW.loan_status::text,
        true
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Fix the appraisal_status trigger function (if exists, update it)
CREATE OR REPLACE FUNCTION execute_appraisal_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  v_auth_user_id uuid;
  v_user_id uuid;
  v_due_date date;
BEGIN
  -- Get the auth user ID
  v_auth_user_id := auth.uid();
  
  -- Map auth user to public user
  SELECT id INTO v_user_id FROM public.users WHERE auth_user_id = v_auth_user_id;
  
  -- Check for appraisal_status change automations
  FOR automation_record IN
    SELECT * FROM task_automations 
    WHERE is_active = true 
    AND trigger_type = 'status_changed'
    AND trigger_config->>'field' = 'appraisal_status'
    AND trigger_config->>'target_status' = NEW.appraisal_status::text
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
      -- Create the task
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
      );
      
      -- Update execution count
      UPDATE task_automations 
      SET execution_count = COALESCE(execution_count, 0) + 1,
          last_run_at = now()
      WHERE id = automation_record.id;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure trigger exists for appraisal_status
DROP TRIGGER IF EXISTS on_appraisal_status_changed ON leads;
CREATE TRIGGER on_appraisal_status_changed
  AFTER UPDATE OF appraisal_status ON leads
  FOR EACH ROW
  WHEN (OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status)
  EXECUTE FUNCTION execute_appraisal_status_changed_automations();