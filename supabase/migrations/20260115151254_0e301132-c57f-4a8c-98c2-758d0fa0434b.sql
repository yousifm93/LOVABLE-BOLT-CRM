-- Fix the lead creation trigger: use assignee_id instead of assigned_to
-- Also add safeguard to prevent infinite recursion

CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
BEGIN
  -- Prevent recursive execution (safeguard)
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Skip Screening stage leads
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995' THEN
    RETURN NEW;
  END IF;

  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    INSERT INTO public.tasks (
      title,
      description,
      borrower_id,
      assignee_id,
      status,
      priority,
      due_date,
      created_by,
      completion_requirement_type
    ) VALUES (
      automation.task_title,
      automation.task_description,
      NEW.id,
      automation.assignee_id,
      'To Do',
      COALESCE(automation.task_priority, 'medium'),
      CASE 
        WHEN automation.due_in_days IS NOT NULL 
        THEN NOW() + (automation.due_in_days || ' days')::INTERVAL 
        ELSE NULL 
      END,
      NEW.created_by,
      automation.completion_requirement_type
    );

    -- Update execution count
    UPDATE public.task_automations 
    SET 
      execution_count = COALESCE(execution_count, 0) + 1,
      last_run_at = NOW()
    WHERE id = automation.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;