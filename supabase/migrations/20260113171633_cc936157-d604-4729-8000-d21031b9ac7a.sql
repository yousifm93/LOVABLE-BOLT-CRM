-- Fix CTC task automation trigger function
-- Problem: The function was looking for trigger_type = 'loan_status_change' which doesn't exist
-- Real automations use trigger_type = 'status_changed' with trigger_config->>'field' = 'loan_status'
-- Also fixes incorrect column references (assigned_to vs assigned_to_user_id, etc.)

CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  loan_type_value TEXT;
  assignee_id_value UUID;
  due_date_value DATE;
  priority_value task_priority;
  existing_task_count INTEGER;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- Get loan type for conditional logic
  loan_type_value := NEW.loan_type;

  RAISE LOG 'execute_loan_status_changed_automations: loan_status changed from % to % for lead % (loan_type=%)', 
    OLD.loan_status, NEW.loan_status, NEW.id, loan_type_value;

  -- Find all active automations matching:
  -- trigger_type = 'status_changed' AND trigger_config->>'field' = 'loan_status' AND trigger_config->>'target_status' = new status
  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'status_changed'
      AND ta.trigger_config->>'field' = 'loan_status'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    RAISE LOG 'execute_loan_status_changed_automations: Found matching automation: % (id=%)', automation.name, automation.id;

    -- Skip buyer's agent and listing agent tasks ONLY for refinance loans
    IF loan_type_value ILIKE '%refinance%' THEN
      IF automation.task_name ILIKE '%buyer''s agent%' 
         OR automation.task_name ILIKE '%listing agent%' THEN
        RAISE LOG 'execute_loan_status_changed_automations: Skipping agent-related task for refinance loan: %', automation.task_name;
        CONTINUE;  -- Skip to next automation, don't exit entirely
      END IF;
    END IF;

    -- Check for existing task to avoid duplicates
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND title = automation.task_name
      AND deleted_at IS NULL;

    IF existing_task_count > 0 THEN
      RAISE LOG 'execute_loan_status_changed_automations: Task already exists for lead %, skipping: %', NEW.id, automation.task_name;
      CONTINUE;
    END IF;

    -- Calculate due date
    IF automation.due_date_offset_days IS NOT NULL THEN
      due_date_value := CURRENT_DATE + automation.due_date_offset_days;
    ELSE
      due_date_value := CURRENT_DATE;
    END IF;

    -- Get priority - cast to task_priority enum
    priority_value := COALESCE(automation.task_priority, 'Medium')::task_priority;

    -- Get assignee from automation config (assigned_to_user_id) or lead's teammate_assigned
    IF automation.assigned_to_user_id IS NOT NULL THEN
      assignee_id_value := automation.assigned_to_user_id;
    ELSE
      assignee_id_value := NEW.teammate_assigned;
    END IF;

    -- Insert the task with correct column names
    INSERT INTO tasks (
      borrower_id,
      title,
      description,
      status,
      priority,
      due_date,
      assignee_id,
      created_by_automation_id
    ) VALUES (
      NEW.id,
      automation.task_name,
      automation.task_description,
      'To Do'::task_status,
      priority_value,
      due_date_value,
      assignee_id_value,
      automation.id
    );

    RAISE LOG 'execute_loan_status_changed_automations: Created task: % for lead % (assignee=%)', 
      automation.task_name, NEW.id, assignee_id_value;

    -- Record execution in task_automation_executions
    INSERT INTO task_automation_executions (
      automation_id,
      lead_id,
      task_id,
      success,
      executed_at
    ) VALUES (
      automation.id,
      NEW.id,
      (SELECT id FROM tasks WHERE borrower_id = NEW.id AND title = automation.task_name AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1),
      true,
      NOW()
    );

  END LOOP;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'execute_loan_status_changed_automations: Error - % - %', SQLSTATE, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add lead_id column to agent_call_logs for linking calls to specific leads
ALTER TABLE public.agent_call_logs 
ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL;

-- Create index for efficient querying of call logs by lead
CREATE INDEX IF NOT EXISTS idx_agent_call_logs_lead_id ON public.agent_call_logs(lead_id, logged_at DESC);

-- Add comment explaining the column
COMMENT ON COLUMN public.agent_call_logs.lead_id IS 'Optional reference to a lead this call is associated with. Allows agent calls to appear in lead activity feeds.';