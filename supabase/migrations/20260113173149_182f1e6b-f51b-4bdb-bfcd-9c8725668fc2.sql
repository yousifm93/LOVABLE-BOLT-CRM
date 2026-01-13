-- Fix the execute_loan_status_changed_automations function
-- Corrects column references and trigger_type matching to work with existing automations

CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  assignee_id_value uuid;
  is_refinance boolean;
  is_agent_call_task boolean;
  automation_count integer := 0;
  task_count integer := 0;
  skip_count integer := 0;
BEGIN
  -- Only run when loan_status actually changes
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  RAISE LOG '[Task Automation] loan_status changed from % to % for lead %', 
    COALESCE(OLD.loan_status::text, 'NULL'), 
    NEW.loan_status::text, 
    NEW.id;

  -- Check if this is a refinance loan
  is_refinance := (LOWER(COALESCE(NEW.transaction_type, '')) = 'refinance');
  
  IF is_refinance THEN
    RAISE LOG '[Task Automation] Lead % is a REFINANCE transaction', NEW.id;
  END IF;

  -- Find matching automations
  -- Match on trigger_type='status_changed' with trigger_config.field='loan_status' and target_status matching
  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'status_changed'
      AND ta.trigger_config->>'field' = 'loan_status'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    automation_count := automation_count + 1;
    RAISE LOG '[Task Automation] Found matching automation: % (id: %)', automation.task_name, automation.id;
    
    BEGIN
      -- Determine if this is an agent call task that should be skipped for refinance
      is_agent_call_task := (
        automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent')
        OR LOWER(automation.task_name) LIKE '%buyer''s agent%'
        OR LOWER(automation.task_name) LIKE '%buyer agent%'
        OR LOWER(automation.task_name) LIKE '%listing agent%'
      );
      
      -- Skip agent call tasks for refinance loans
      IF is_refinance AND is_agent_call_task THEN
        RAISE LOG '[Task Automation] SKIPPING agent call task "%" for refinance lead %', 
          automation.task_name, NEW.id;
        skip_count := skip_count + 1;
        
        -- Log the skipped execution
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          error_message,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          NULL,
          true,
          'Skipped: Agent call task not applicable for refinance loans',
          NOW()
        );
        
        CONTINUE;
      END IF;
      
      -- Check for duplicate tasks (same borrower + title, not deleted)
      IF EXISTS (
        SELECT 1 FROM tasks 
        WHERE borrower_id = NEW.id 
          AND title = automation.task_name 
          AND deleted_at IS NULL
      ) THEN
        RAISE LOG '[Task Automation] SKIPPING duplicate task "%" for lead %', 
          automation.task_name, NEW.id;
        skip_count := skip_count + 1;
        
        INSERT INTO task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          error_message,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          NULL,
          true,
          'Skipped: Duplicate task already exists',
          NOW()
        );
        
        CONTINUE;
      END IF;
      
      -- Determine assignee: use automation's assigned user, fall back to lead's assigned teammate
      assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);
      
      -- Create the task
      INSERT INTO tasks (
        title,
        description,
        borrower_id,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        completion_requirement_type
      ) VALUES (
        automation.task_name,
        automation.task_description,
        NEW.id,
        assignee_id_value,
        COALESCE(automation.task_priority, 'Medium')::task_priority,
        CASE 
          WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days
          ELSE NULL
        END,
        'To Do'::task_status,
        assignee_id_value,
        automation.completion_requirement_type
      )
      RETURNING id INTO new_task_id;
      
      task_count := task_count + 1;
      RAISE LOG '[Task Automation] Created task "%" (id: %) for lead %', 
        automation.task_name, new_task_id, NEW.id;
      
      -- Log successful execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        success,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        new_task_id,
        true,
        NOW()
      );
      
      -- Update automation last_run_at and execution_count
      UPDATE task_automations
      SET last_run_at = NOW(),
          execution_count = COALESCE(execution_count, 0) + 1
      WHERE id = automation.id;
      
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG '[Task Automation] ERROR creating task "%" for lead %: %', 
        automation.task_name, NEW.id, SQLERRM;
      
      -- Log failed execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_id,
        success,
        error_message,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        NULL,
        false,
        SQLERRM,
        NOW()
      );
    END;
  END LOOP;

  RAISE LOG '[Task Automation] Summary for lead %: % automations matched, % tasks created, % skipped', 
    NEW.id, automation_count, task_count, skip_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;