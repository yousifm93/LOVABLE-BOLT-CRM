-- Update all task automation trigger functions to skip buyer/listing agent call tasks for refinance transactions

-- Function to execute status changed automations (updated to check loan_type for refinance)
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  priority_value text := 'Medium';
  due_date_value date;
  delay_days int;
  delay_hours int;
  delay_minutes int;
  assignee_id_value uuid;
  task_title text;
  task_description text;
  existing_task_count int;
  last_task_assignee uuid;
  new_stage_name text;
  old_stage_name text;
  loan_type_value text;
BEGIN
  -- Get stage names for logging
  SELECT name INTO new_stage_name FROM pipeline_stages WHERE id = NEW.pipeline_stage_id;
  SELECT name INTO old_stage_name FROM pipeline_stages WHERE id = OLD.pipeline_stage_id;
  
  -- Get the loan type for this lead
  loan_type_value := NEW.loan_type;
  
  RAISE LOG 'execute_pipeline_stage_changed_automations: Lead % stage changed from % to %, loan_type: %', 
    NEW.id, old_stage_name, new_stage_name, loan_type_value;

  -- Find active automations that match this status change
  FOR automation IN
    SELECT ta.*, et.name as template_name, et.body as template_body
    FROM task_automations ta
    LEFT JOIN email_templates et ON et.id = ta.email_template_id
    WHERE ta.is_active = true
      AND ta.trigger_type = 'pipeline_stage_change'
      AND ta.trigger_config->>'to_stage_id' = NEW.pipeline_stage_id::text
  LOOP
    RAISE LOG 'execute_pipeline_stage_changed_automations: Processing automation % for lead %', automation.name, NEW.id;
    
    -- Skip buyer/listing agent call tasks for refinance transactions
    IF loan_type_value = 'Refinance' AND automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent') THEN
      RAISE LOG 'execute_pipeline_stage_changed_automations: Skipping automation % for refinance transaction', automation.name;
      CONTINUE;
    END IF;
    
    -- Check if a similar task already exists (not Done) to avoid duplicates
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND title = automation.task_title
      AND status != 'Done';
    
    IF existing_task_count > 0 THEN
      RAISE LOG 'execute_pipeline_stage_changed_automations: Task already exists for automation %, skipping', automation.name;
      CONTINUE;
    END IF;

    -- Calculate due date based on delay settings
    delay_days := COALESCE((automation.due_date_config->>'delay_days')::int, 0);
    delay_hours := COALESCE((automation.due_date_config->>'delay_hours')::int, 0);
    delay_minutes := COALESCE((automation.due_date_config->>'delay_minutes')::int, 0);
    
    due_date_value := CURRENT_DATE + delay_days;
    
    -- Use the configured assignee, or try to find the last assignee for this lead
    assignee_id_value := automation.default_assignee_id;
    
    IF assignee_id_value IS NULL THEN
      SELECT assignee_id INTO assignee_id_value
      FROM tasks
      WHERE borrower_id = NEW.id
        AND assignee_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1;
    END IF;
    
    -- Fall back to default if still null
    IF assignee_id_value IS NULL THEN
      assignee_id_value := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'::uuid;
    END IF;

    -- Create the task
    INSERT INTO tasks (
      title,
      description,
      due_date,
      status,
      priority,
      borrower_id,
      assignee_id,
      automation_id,
      completion_requirement_type
    ) VALUES (
      automation.task_title,
      automation.task_description,
      due_date_value,
      'To Do',
      priority_value,
      NEW.id,
      assignee_id_value,
      automation.id,
      automation.completion_requirement_type
    )
    RETURNING id INTO new_task_id;

    RAISE LOG 'execute_pipeline_stage_changed_automations: Created task % for automation %', new_task_id, automation.name;

    -- Update automation execution stats
    UPDATE task_automations
    SET execution_count = COALESCE(execution_count, 0) + 1,
        last_run_at = NOW()
    WHERE id = automation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Update the appraisal status automation to check for refinance
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  priority_value text := 'Medium';
  due_date_value date;
  delay_days int;
  assignee_id_value uuid;
  existing_task_count int;
  loan_type_value text;
BEGIN
  IF OLD.appraisal_status IS NOT DISTINCT FROM NEW.appraisal_status THEN
    RETURN NEW;
  END IF;

  -- Get the loan type for this lead
  loan_type_value := NEW.loan_type;

  RAISE LOG 'execute_appraisal_status_changed_automations: Lead % appraisal_status changed from % to %, loan_type: %', 
    NEW.id, OLD.appraisal_status, NEW.appraisal_status, loan_type_value;

  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'appraisal_status_change'
      AND ta.trigger_config->>'target_status' = NEW.appraisal_status
  LOOP
    RAISE LOG 'execute_appraisal_status_changed_automations: Processing automation % for lead %', automation.name, NEW.id;
    
    -- Skip buyer/listing agent call tasks for refinance transactions
    IF loan_type_value = 'Refinance' AND automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent') THEN
      RAISE LOG 'execute_appraisal_status_changed_automations: Skipping automation % for refinance transaction', automation.name;
      CONTINUE;
    END IF;
    
    -- Check if a similar task already exists (not Done) to avoid duplicates
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id
      AND title = automation.task_title
      AND status != 'Done';
    
    IF existing_task_count > 0 THEN
      RAISE LOG 'execute_appraisal_status_changed_automations: Task already exists for automation %, skipping', automation.name;
      CONTINUE;
    END IF;

    delay_days := COALESCE((automation.due_date_config->>'delay_days')::int, 0);
    due_date_value := CURRENT_DATE + delay_days;
    
    assignee_id_value := automation.default_assignee_id;
    
    IF assignee_id_value IS NULL THEN
      SELECT assignee_id INTO assignee_id_value
      FROM tasks
      WHERE borrower_id = NEW.id AND assignee_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    
    IF assignee_id_value IS NULL THEN
      assignee_id_value := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'::uuid;
    END IF;

    INSERT INTO tasks (
      title, description, due_date, status, priority,
      borrower_id, assignee_id, automation_id, completion_requirement_type
    ) VALUES (
      automation.task_title, automation.task_description, due_date_value,
      'To Do', priority_value, NEW.id, assignee_id_value, automation.id,
      automation.completion_requirement_type
    ) RETURNING id INTO new_task_id;

    UPDATE task_automations
    SET execution_count = COALESCE(execution_count, 0) + 1, last_run_at = NOW()
    WHERE id = automation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Update the disclosure status automation to check for refinance
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  priority_value text := 'Medium';
  due_date_value date;
  delay_days int;
  assignee_id_value uuid;
  existing_task_count int;
  loan_type_value text;
BEGIN
  IF OLD.disclosure_status IS NOT DISTINCT FROM NEW.disclosure_status THEN
    RETURN NEW;
  END IF;

  -- Get the loan type for this lead
  loan_type_value := NEW.loan_type;

  RAISE LOG 'execute_disclosure_status_changed_automations: Lead % disclosure_status changed from % to %, loan_type: %', 
    NEW.id, OLD.disclosure_status, NEW.disclosure_status, loan_type_value;

  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'disclosure_status_change'
      AND ta.trigger_config->>'target_status' = NEW.disclosure_status
  LOOP
    RAISE LOG 'execute_disclosure_status_changed_automations: Processing automation % for lead %', automation.name, NEW.id;
    
    -- Skip buyer/listing agent call tasks for refinance transactions
    IF loan_type_value = 'Refinance' AND automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent') THEN
      RAISE LOG 'execute_disclosure_status_changed_automations: Skipping automation % for refinance transaction', automation.name;
      CONTINUE;
    END IF;
    
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id AND title = automation.task_title AND status != 'Done';
    
    IF existing_task_count > 0 THEN
      CONTINUE;
    END IF;

    delay_days := COALESCE((automation.due_date_config->>'delay_days')::int, 0);
    due_date_value := CURRENT_DATE + delay_days;
    
    assignee_id_value := automation.default_assignee_id;
    IF assignee_id_value IS NULL THEN
      SELECT assignee_id INTO assignee_id_value
      FROM tasks WHERE borrower_id = NEW.id AND assignee_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF assignee_id_value IS NULL THEN
      assignee_id_value := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'::uuid;
    END IF;

    INSERT INTO tasks (
      title, description, due_date, status, priority,
      borrower_id, assignee_id, automation_id, completion_requirement_type
    ) VALUES (
      automation.task_title, automation.task_description, due_date_value,
      'To Do', priority_value, NEW.id, assignee_id_value, automation.id,
      automation.completion_requirement_type
    ) RETURNING id INTO new_task_id;

    UPDATE task_automations
    SET execution_count = COALESCE(execution_count, 0) + 1, last_run_at = NOW()
    WHERE id = automation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Update the loan status automation to check for refinance
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  priority_value text := 'Medium';
  due_date_value date;
  delay_days int;
  assignee_id_value uuid;
  existing_task_count int;
  loan_type_value text;
BEGIN
  IF OLD.loan_status IS NOT DISTINCT FROM NEW.loan_status THEN
    RETURN NEW;
  END IF;

  -- Get the loan type for this lead
  loan_type_value := NEW.loan_type;

  RAISE LOG 'execute_loan_status_changed_automations: Lead % loan_status changed from % to %, loan_type: %', 
    NEW.id, OLD.loan_status, NEW.loan_status, loan_type_value;

  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'loan_status_change'
      AND ta.trigger_config->>'target_status' = NEW.loan_status
  LOOP
    RAISE LOG 'execute_loan_status_changed_automations: Processing automation % for lead %', automation.name, NEW.id;
    
    -- Skip buyer/listing agent call tasks for refinance transactions
    IF loan_type_value = 'Refinance' AND automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent') THEN
      RAISE LOG 'execute_loan_status_changed_automations: Skipping automation % for refinance transaction', automation.name;
      CONTINUE;
    END IF;
    
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id AND title = automation.task_title AND status != 'Done';
    
    IF existing_task_count > 0 THEN
      CONTINUE;
    END IF;

    delay_days := COALESCE((automation.due_date_config->>'delay_days')::int, 0);
    due_date_value := CURRENT_DATE + delay_days;
    
    assignee_id_value := automation.default_assignee_id;
    IF assignee_id_value IS NULL THEN
      SELECT assignee_id INTO assignee_id_value
      FROM tasks WHERE borrower_id = NEW.id AND assignee_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF assignee_id_value IS NULL THEN
      assignee_id_value := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'::uuid;
    END IF;

    INSERT INTO tasks (
      title, description, due_date, status, priority,
      borrower_id, assignee_id, automation_id, completion_requirement_type
    ) VALUES (
      automation.task_title, automation.task_description, due_date_value,
      'To Do', priority_value, NEW.id, assignee_id_value, automation.id,
      automation.completion_requirement_type
    ) RETURNING id INTO new_task_id;

    UPDATE task_automations
    SET execution_count = COALESCE(execution_count, 0) + 1, last_run_at = NOW()
    WHERE id = automation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- Update the package status automation to check for refinance
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  priority_value text := 'Medium';
  due_date_value date;
  delay_days int;
  assignee_id_value uuid;
  existing_task_count int;
  loan_type_value text;
BEGIN
  IF OLD.package_status IS NOT DISTINCT FROM NEW.package_status THEN
    RETURN NEW;
  END IF;

  -- Get the loan type for this lead
  loan_type_value := NEW.loan_type;

  RAISE LOG 'execute_package_status_changed_automations: Lead % package_status changed from % to %, loan_type: %', 
    NEW.id, OLD.package_status, NEW.package_status, loan_type_value;

  FOR automation IN
    SELECT ta.*
    FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'package_status_change'
      AND ta.trigger_config->>'target_status' = NEW.package_status
  LOOP
    RAISE LOG 'execute_package_status_changed_automations: Processing automation % for lead %', automation.name, NEW.id;
    
    -- Skip buyer/listing agent call tasks for refinance transactions
    IF loan_type_value = 'Refinance' AND automation.completion_requirement_type IN ('log_call_buyer_agent', 'log_call_listing_agent') THEN
      RAISE LOG 'execute_package_status_changed_automations: Skipping automation % for refinance transaction', automation.name;
      CONTINUE;
    END IF;
    
    SELECT COUNT(*) INTO existing_task_count
    FROM tasks
    WHERE borrower_id = NEW.id AND title = automation.task_title AND status != 'Done';
    
    IF existing_task_count > 0 THEN
      CONTINUE;
    END IF;

    delay_days := COALESCE((automation.due_date_config->>'delay_days')::int, 0);
    due_date_value := CURRENT_DATE + delay_days;
    
    assignee_id_value := automation.default_assignee_id;
    IF assignee_id_value IS NULL THEN
      SELECT assignee_id INTO assignee_id_value
      FROM tasks WHERE borrower_id = NEW.id AND assignee_id IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
    END IF;
    IF assignee_id_value IS NULL THEN
      assignee_id_value := 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee'::uuid;
    END IF;

    INSERT INTO tasks (
      title, description, due_date, status, priority,
      borrower_id, assignee_id, automation_id, completion_requirement_type
    ) VALUES (
      automation.task_title, automation.task_description, due_date_value,
      'To Do', priority_value, NEW.id, assignee_id_value, automation.id,
      automation.completion_requirement_type
    ) RETURNING id INTO new_task_id;

    UPDATE task_automations
    SET execution_count = COALESCE(execution_count, 0) + 1, last_run_at = NOW()
    WHERE id = automation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;