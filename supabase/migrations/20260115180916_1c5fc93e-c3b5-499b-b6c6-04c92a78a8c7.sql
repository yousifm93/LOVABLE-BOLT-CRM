-- Fix execute_package_status_changed_automations to cast priority to enum
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $function$
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
        'Open',
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
$function$;

-- Fix create_no_open_task_found to cast priority to enum
CREATE OR REPLACE FUNCTION public.create_no_open_task_found()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_open_task_count INT;
  v_lead_stage_id UUID;
  v_lead_first_name TEXT;
  v_lead_last_name TEXT;
  v_last_assignee_id UUID;
  v_today DATE := CURRENT_DATE;
  v_existing_no_task_count INT;
  v_target_stage_ids UUID[] := ARRAY[
    'da831e5a-a9cf-47f9-8b04-8fbb4a309876'::UUID,
    '05e5aa00-a12c-44e4-9b4b-52e0c46b5472'::UUID,
    'c4c29499-cb97-4e57-86c1-05f3b69e04cb'::UUID,
    '9b1d7e4f-5b77-4f67-ae80-83f3e8ab9e6a'::UUID,
    '9d0f6b1f-8a09-4f0e-a04c-17f5a6c5e5c9'::UUID,
    '0be47107-55b0-405d-a994-55ccff7fc614'::UUID
  ];
  v_default_assignee_id UUID := '68c709b5-c0f6-4f17-8cf3-443714e2eba5'::UUID;
BEGIN
  IF NEW.status = 'Done' AND (OLD.status IS DISTINCT FROM 'Done') THEN
    IF NEW.borrower_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT pipeline_stage_id, first_name, last_name
    INTO v_lead_stage_id, v_lead_first_name, v_lead_last_name
    FROM leads
    WHERE id = NEW.borrower_id AND deleted_at IS NULL;

    IF v_lead_stage_id IS NULL OR NOT (v_lead_stage_id = ANY(v_target_stage_ids)) THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO v_open_task_count
    FROM tasks
    WHERE borrower_id = NEW.borrower_id
      AND id != NEW.id
      AND status IN ('To Do', 'Working on it')
      AND deleted_at IS NULL;

    IF v_open_task_count > 0 THEN
      RETURN NEW;
    END IF;

    SELECT COUNT(*)
    INTO v_existing_no_task_count
    FROM tasks
    WHERE borrower_id = NEW.borrower_id
      AND task_name = 'No open task found'
      AND status IN ('To Do', 'Working on it')
      AND deleted_at IS NULL;

    IF v_existing_no_task_count > 0 THEN
      RETURN NEW;
    END IF;

    v_last_assignee_id := COALESCE(NEW.assignee_id, v_default_assignee_id);

    INSERT INTO tasks (
      task_name,
      borrower_id,
      assignee_id,
      due_date,
      status,
      priority,
      creation_log
    ) VALUES (
      'No open task found',
      NEW.borrower_id,
      v_last_assignee_id,
      v_today,
      'To Do',
      'High'::task_priority,
      jsonb_build_array(
        jsonb_build_object(
          'message', 'Auto-created: No remaining open tasks for ' || COALESCE(v_lead_first_name, '') || ' ' || COALESCE(v_lead_last_name, ''),
          'timestamp', NOW()::text
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;