-- Fix the trigger function to use correct column name (task_priority instead of default_priority)
CREATE OR REPLACE FUNCTION execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation_record RECORD;
  resolved_assignee_id UUID;
  fallback_assignee_id UUID := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';
  yousif_id UUID := '29ae7b57-9304-4c0b-9a85-7f3ad18c8acc';
  herman_id UUID := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';
  public_user_id UUID;
  prev_task_assignee UUID;
  loop_counter INTEGER := 0;
  new_task_id UUID;
  loan_type_val TEXT;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  RAISE LOG '[LoanStatusTrigger] Loan status changed from % to % for lead %', 
    OLD.loan_status::text, NEW.loan_status::text, NEW.id;

  -- Get loan type for refinance bypass logic
  loan_type_val := NEW.loan_type;

  -- Loop through all active automations for this trigger type  
  FOR automation_record IN 
    SELECT ta.* 
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'status_changed'
      AND ta.trigger_config->>'field' = 'loan_status'
      AND ta.trigger_config->>'target_status' = NEW.loan_status::text
  LOOP
    loop_counter := loop_counter + 1;
    RAISE LOG '[LoanStatusTrigger] Processing automation: % (ID: %)', automation_record.name, automation_record.id;

    -- Skip buyer's agent and listing agent tasks for refinance loans
    IF loan_type_val ILIKE '%Refinance%' THEN
      IF automation_record.task_name ILIKE '%buyer''s agent%' 
         OR automation_record.task_name ILIKE '%listing agent%' THEN
        RAISE LOG '[LoanStatusTrigger] Skipping agent-related task for refinance loan: %', automation_record.task_name;
        CONTINUE;
      END IF;
    END IF;

    -- Check if task with same name already exists for this lead (not completed, created within 14 days)
    IF EXISTS (
      SELECT 1 FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND t.title = automation_record.task_name
        AND t.status::text NOT IN ('Done')
        AND t.created_at > (CURRENT_TIMESTAMP - INTERVAL '14 days')
    ) THEN
      RAISE LOG '[LoanStatusTrigger] Skipping - task "%" already exists (not done, <14 days old) for lead %', 
        automation_record.task_name, NEW.id;
      CONTINUE;
    END IF;

    -- Resolve assignment - use teammate_assigned from lead first
    resolved_assignee_id := NEW.teammate_assigned;
    
    IF resolved_assignee_id IS NULL THEN
      -- Try to get from previous task
      SELECT t.assignee_id INTO prev_task_assignee
      FROM tasks t
      WHERE t.borrower_id = NEW.id
        AND t.assignee_id IS NOT NULL
      ORDER BY t.created_at DESC
      LIMIT 1;
      
      IF prev_task_assignee IS NOT NULL THEN
        resolved_assignee_id := prev_task_assignee;
        RAISE LOG '[LoanStatusTrigger] Using previous task assignee: %', resolved_assignee_id;
      END IF;
    END IF;
    
    IF resolved_assignee_id IS NULL THEN
      resolved_assignee_id := yousif_id;
      RAISE LOG '[LoanStatusTrigger] Falling back to Yousif: %', resolved_assignee_id;
    END IF;

    -- Create the task - use task_priority (correct column name)
    INSERT INTO tasks (
      borrower_id,
      title,
      description,
      assignee_id,
      priority,
      status,
      due_date,
      automation_id
    ) VALUES (
      NEW.id,
      automation_record.task_name,
      COALESCE(automation_record.task_description, ''),
      resolved_assignee_id,
      COALESCE(automation_record.task_priority, 'Medium')::task_priority,
      'To Do'::task_status,
      CURRENT_DATE,
      automation_record.id
    )
    RETURNING id INTO new_task_id;

    RAISE LOG '[LoanStatusTrigger] Created task "%" (ID: %) for lead %, assigned to %', 
      automation_record.task_name, new_task_id, NEW.id, resolved_assignee_id;

    -- Log execution
    INSERT INTO task_automation_executions (
      automation_id,
      lead_id,
      task_id,
      success,
      executed_at,
      trigger_data
    ) VALUES (
      automation_record.id,
      NEW.id,
      new_task_id,
      true,
      NOW(),
      jsonb_build_object(
        'old_loan_status', OLD.loan_status::text,
        'new_loan_status', NEW.loan_status::text
      )
    );

  END LOOP;

  RAISE LOG '[LoanStatusTrigger] Processed % automations for lead %', loop_counter, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;