-- Create function to auto-create "No open task found" task when last task is completed
CREATE OR REPLACE FUNCTION public.create_no_open_task_found()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_pipeline_stage_id uuid;
  v_lead_first_name text;
  v_lead_last_name text;
  v_open_task_count integer;
  v_existing_no_task_count integer;
  v_last_assignee_id uuid;
  v_today date := CURRENT_DATE;
  -- Target pipeline stages (excluding Past Clients and Idle)
  v_target_stages uuid[] := ARRAY[
    'c54f417b-3f67-43de-80f5-954cf260d571'::uuid, -- Leads
    '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945'::uuid, -- Pending App
    'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid, -- Screening
    '09162eec-d2b2-48e5-86d0-9e66ee8b2af7'::uuid, -- Pre-Qualified
    '3cbf38ff-752e-4163-a9a3-1757499b4945'::uuid, -- Pre-Approved
    '76eb2e82-e1d9-4f2d-a57d-2120a25696db'::uuid  -- Active
  ];
  v_default_assignee_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- Yousif Mohamed
BEGIN
  -- Only trigger when status changes TO 'Done'
  IF NEW.status = 'Done' AND (OLD.status IS NULL OR OLD.status != 'Done') AND NEW.borrower_id IS NOT NULL THEN
    
    -- Get lead info and check if in target pipeline stage
    SELECT pipeline_stage_id, first_name, last_name 
    INTO v_lead_pipeline_stage_id, v_lead_first_name, v_lead_last_name
    FROM leads
    WHERE id = NEW.borrower_id AND deleted_at IS NULL;
    
    -- Exit if lead not found or not in a target stage
    IF v_lead_pipeline_stage_id IS NULL OR NOT (v_lead_pipeline_stage_id = ANY(v_target_stages)) THEN
      RETURN NEW;
    END IF;
    
    -- Count remaining open tasks for this lead (excluding the one just completed)
    SELECT COUNT(*) INTO v_open_task_count
    FROM tasks
    WHERE borrower_id = NEW.borrower_id
      AND id != NEW.id
      AND status IN ('To Do', 'Working on it')
      AND deleted_at IS NULL;
    
    -- If there are still open tasks, no need to create a new one
    IF v_open_task_count > 0 THEN
      RETURN NEW;
    END IF;
    
    -- Check if there's already a "No open task found" task open for this lead
    SELECT COUNT(*) INTO v_existing_no_task_count
    FROM tasks
    WHERE borrower_id = NEW.borrower_id
      AND title = 'No open task found'
      AND status IN ('To Do', 'Working on it')
      AND deleted_at IS NULL;
    
    -- If one already exists, don't create a duplicate
    IF v_existing_no_task_count > 0 THEN
      RETURN NEW;
    END IF;
    
    -- Use the assignee from the just-completed task, fallback to default
    v_last_assignee_id := COALESCE(NEW.assignee_id, v_default_assignee_id);
    
    -- Create the "No open task found" task
    INSERT INTO tasks (
      title,
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
      'Auto-created: No remaining open tasks for ' || COALESCE(v_lead_first_name, '') || ' ' || COALESCE(v_lead_last_name, '') || '. Assigned to last task assignee.'
    );
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_create_no_open_task_found ON tasks;

-- Create trigger on tasks table
CREATE TRIGGER trigger_create_no_open_task_found
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.create_no_open_task_found();