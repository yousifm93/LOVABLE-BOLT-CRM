-- Fix the create_no_open_task_found function to use proper JSONB format
CREATE OR REPLACE FUNCTION public.create_no_open_task_found()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open_task_count INT;
  v_lead_stage_id UUID;
  v_lead_first_name TEXT;
  v_lead_last_name TEXT;
  v_last_assignee_id UUID;
  v_today DATE := CURRENT_DATE;
  v_existing_no_task_count INT;
  v_target_stage_ids UUID[] := ARRAY[
    'da831e5a-a9cf-47f9-8b04-8fbb4a309876'::UUID, -- Leads
    '05e5aa00-a12c-44e4-9b4b-52e0c46b5472'::UUID, -- Pending App
    'c4c29499-cb97-4e57-86c1-05f3b69e04cb'::UUID, -- Screening
    '9b1d7e4f-5b77-4f67-ae80-83f3e8ab9e6a'::UUID, -- Pre-Qualified
    '9d0f6b1f-8a09-4f0e-a04c-17f5a6c5e5c9'::UUID, -- Pre-Approved
    '0be47107-55b0-405d-a994-55ccff7fc614'::UUID  -- Active
  ];
  v_default_assignee_id UUID := '68c709b5-c0f6-4f17-8cf3-443714e2eba5'::UUID;
BEGIN
  -- Only trigger when status changes to 'Done'
  IF NEW.status = 'Done' AND (OLD.status IS DISTINCT FROM 'Done') THEN
    -- Check if this task has a borrower_id (lead_id)
    IF NEW.borrower_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get lead info and check if in target stages
    SELECT pipeline_stage_id, first_name, last_name
    INTO v_lead_stage_id, v_lead_first_name, v_lead_last_name
    FROM leads
    WHERE id = NEW.borrower_id AND deleted_at IS NULL;

    -- If lead not in target stages, exit
    IF v_lead_stage_id IS NULL OR NOT (v_lead_stage_id = ANY(v_target_stage_ids)) THEN
      RETURN NEW;
    END IF;

    -- Count remaining open tasks for this lead (excluding the just-completed one)
    SELECT COUNT(*)
    INTO v_open_task_count
    FROM tasks
    WHERE borrower_id = NEW.borrower_id
      AND id != NEW.id
      AND status IN ('To Do', 'Working on it')
      AND deleted_at IS NULL;

    -- If there are still open tasks, exit
    IF v_open_task_count > 0 THEN
      RETURN NEW;
    END IF;

    -- Check if there's already an open "No open task found" task
    SELECT COUNT(*)
    INTO v_existing_no_task_count
    FROM tasks
    WHERE borrower_id = NEW.borrower_id
      AND task_name = 'No open task found'
      AND status IN ('To Do', 'Working on it')
      AND deleted_at IS NULL;

    -- If one already exists, don't create another
    IF v_existing_no_task_count > 0 THEN
      RETURN NEW;
    END IF;

    -- Get the assignee from the just-completed task
    v_last_assignee_id := COALESCE(NEW.assignee_id, v_default_assignee_id);

    -- Create the "No open task found" task with proper JSONB format
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
      'High',
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
$$;

-- Drop and recreate the trigger to ensure it's properly attached
DROP TRIGGER IF EXISTS trigger_create_no_open_task_found ON tasks;

CREATE TRIGGER trigger_create_no_open_task_found
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_no_open_task_found();