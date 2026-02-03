-- Fix invalid enum value 'Archived' error in all trigger functions
-- Change status != 'Archived' to status::text NOT IN ('Done')

-- 1. Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION execute_disclosure_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  user_record RECORD;
  new_task_id UUID;
BEGIN
  -- Only proceed if disclosure_status actually changed
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    -- Find matching automations
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'trigger_field')::text = 'disclosure_status'
        AND (ta.trigger_config->>'trigger_value')::text = NEW.disclosure_status::text
    LOOP
      -- Check if task already exists for this automation and lead (exclude completed tasks)
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
          AND automation_id = automation_record.id
          AND status::text NOT IN ('Done')
      ) THEN
        -- Resolve user for assignment
        SELECT * INTO user_record FROM users WHERE id = automation_record.default_assignee_id;
        IF user_record IS NULL THEN
          SELECT * INTO user_record FROM users WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
        END IF;
        
        -- Create the task
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          due_date,
          assignee_id,
          borrower_id,
          automation_id,
          created_by
        ) VALUES (
          automation_record.task_title,
          automation_record.task_description,
          'To Do'::task_status,
          'Medium'::task_priority,
          CURRENT_DATE,
          user_record.id,
          NEW.id,
          automation_record.id,
          user_record.id
        ) RETURNING id INTO new_task_id;
        
        -- Log execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          executed_at
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          true,
          NOW()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix execute_loan_status_changed_automations
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  user_record RECORD;
  new_task_id UUID;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    -- Find matching automations
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'trigger_field')::text = 'loan_status'
        AND (ta.trigger_config->>'trigger_value')::text = NEW.loan_status::text
    LOOP
      -- Check if task already exists for this automation and lead (exclude completed tasks)
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
          AND automation_id = automation_record.id
          AND status::text NOT IN ('Done')
      ) THEN
        -- Resolve user for assignment
        SELECT * INTO user_record FROM users WHERE id = automation_record.default_assignee_id;
        IF user_record IS NULL THEN
          SELECT * INTO user_record FROM users WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
        END IF;
        
        -- Create the task
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          due_date,
          assignee_id,
          borrower_id,
          automation_id,
          created_by
        ) VALUES (
          automation_record.task_title,
          automation_record.task_description,
          'To Do'::task_status,
          'Medium'::task_priority,
          CURRENT_DATE,
          user_record.id,
          NEW.id,
          automation_record.id,
          user_record.id
        ) RETURNING id INTO new_task_id;
        
        -- Log execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          executed_at
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          true,
          NOW()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION execute_pipeline_stage_changed_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  user_record RECORD;
  new_task_id UUID;
BEGIN
  -- Only proceed if pipeline_stage actually changed
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    -- Find matching automations
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'trigger_field')::text = 'pipeline_stage'
        AND (ta.trigger_config->>'trigger_value')::text = NEW.pipeline_stage::text
    LOOP
      -- Check if task already exists for this automation and lead (exclude completed tasks)
      IF NOT EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
          AND automation_id = automation_record.id
          AND status::text NOT IN ('Done')
      ) THEN
        -- Resolve user for assignment
        SELECT * INTO user_record FROM users WHERE id = automation_record.default_assignee_id;
        IF user_record IS NULL THEN
          SELECT * INTO user_record FROM users WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
        END IF;
        
        -- Create the task
        INSERT INTO tasks (
          title,
          description,
          status,
          priority,
          due_date,
          assignee_id,
          borrower_id,
          automation_id,
          created_by
        ) VALUES (
          automation_record.task_title,
          automation_record.task_description,
          'To Do'::task_status,
          'Medium'::task_priority,
          CURRENT_DATE,
          user_record.id,
          NEW.id,
          automation_record.id,
          user_record.id
        ) RETURNING id INTO new_task_id;
        
        -- Log execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          executed_at
        ) VALUES (
          automation_record.id,
          NEW.id,
          new_task_id,
          true,
          NOW()
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix execute_lead_created_automations
CREATE OR REPLACE FUNCTION execute_lead_created_automations()
RETURNS trigger AS $$
DECLARE
  automation_record RECORD;
  user_record RECORD;
  new_task_id UUID;
BEGIN
  -- Find matching automations for lead creation
  FOR automation_record IN
    SELECT ta.* 
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'lead_created'
  LOOP
    -- Check if task already exists for this automation and lead (exclude completed tasks)
    IF NOT EXISTS (
      SELECT 1 FROM tasks 
      WHERE borrower_id = NEW.id 
        AND automation_id = automation_record.id
        AND status::text NOT IN ('Done')
    ) THEN
      -- Resolve user for assignment
      SELECT * INTO user_record FROM users WHERE id = automation_record.default_assignee_id;
      IF user_record IS NULL THEN
        SELECT * INTO user_record FROM users WHERE id = '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
      END IF;
      
      -- Create the task
      INSERT INTO tasks (
        title,
        description,
        status,
        priority,
        due_date,
        assignee_id,
        borrower_id,
        automation_id,
        created_by
      ) VALUES (
        automation_record.task_title,
        automation_record.task_description,
        'To Do'::task_status,
        'Medium'::task_priority,
        CURRENT_DATE,
        user_record.id,
        NEW.id,
        automation_record.id,
        user_record.id
      ) RETURNING id INTO new_task_id;
      
      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        success,
        executed_at
      ) VALUES (
        automation_record.id,
        NEW.id,
        new_task_id,
        true,
        NOW()
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;