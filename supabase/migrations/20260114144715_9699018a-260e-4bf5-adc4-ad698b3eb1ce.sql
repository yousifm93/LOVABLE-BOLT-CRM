-- Fix execute_appraisal_status_changed_automations: cast enum to text
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  -- Only proceed if appraisal_status actually changed
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    -- Get current user
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Find matching task automations
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'appraisal_status_change'
        AND ta.trigger_config->>'target_status' = NEW.appraisal_status::text
    LOOP
      -- Create task from automation
      INSERT INTO tasks (
        lead_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'Open',
        v_user_id,
        automation.id
      );

      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_created,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        true,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix execute_disclosure_status_changed_automations: cast enum to text
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  -- Only proceed if disclosure_status actually changed
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    -- Get current user
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Find matching task automations
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'disclosure_status_change'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      -- Create task from automation
      INSERT INTO tasks (
        lead_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'Open',
        v_user_id,
        automation.id
      );

      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_created,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        true,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix execute_package_status_changed_automations: cast enum to text
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  -- Only proceed if package_status actually changed
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    -- Get current user
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Find matching task automations
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'package_status_change'
        AND ta.trigger_config->>'target_status' = NEW.package_status::text
    LOOP
      -- Create task from automation
      INSERT INTO tasks (
        lead_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'Open',
        v_user_id,
        automation.id
      );

      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_created,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        true,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix execute_pipeline_stage_changed_automations: remove email_template_id reference
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  -- Only proceed if pipeline_stage_id actually changed
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    -- Get current user
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Find matching task automations (no email_template join)
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'pipeline_stage_change'
        AND (ta.trigger_config->>'target_stage_id')::uuid = NEW.pipeline_stage_id
    LOOP
      -- Create task from automation
      INSERT INTO tasks (
        lead_id,
        title,
        description,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        automation_id
      ) VALUES (
        NEW.id,
        automation.task_name,
        automation.task_description,
        automation.assigned_to_user_id,
        automation.task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'Open',
        v_user_id,
        automation.id
      );

      -- Log execution
      INSERT INTO task_automation_executions (
        automation_id,
        lead_id,
        task_created,
        executed_at
      ) VALUES (
        automation.id,
        NEW.id,
        true,
        NOW()
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;