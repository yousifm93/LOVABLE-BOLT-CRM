-- Fix trigger functions using invalid 'Open' task status

-- 1. Fix execute_appraisal_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'appraisal_status'
        AND ta.trigger_config->>'target_status' = NEW.appraisal_status::text
    LOOP
      INSERT INTO tasks (
        borrower_id,
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
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'To Do',
        v_user_id,
        automation.id
      );

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
$$;

-- 2. Fix execute_package_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'package_status_change'
        AND ta.trigger_config->>'target_status' = NEW.package_status::text
    LOOP
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
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'To Do',
        v_user_id,
        automation.id
      );

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
$$;

-- 3. Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  v_user_id uuid;
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'disclosure_status_change'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
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
        automation.task_priority::task_priority,
        CASE WHEN automation.due_date_offset_days IS NOT NULL 
          THEN CURRENT_DATE + automation.due_date_offset_days 
          ELSE NULL 
        END,
        'To Do',
        v_user_id,
        automation.id
      );

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
$$;