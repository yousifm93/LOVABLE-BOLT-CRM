-- Update the execute_lead_created_automations function to skip leads in Screening stage
-- This prevents the "Follow up on new lead" task from being created for application submissions
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  task_id UUID;
BEGIN
  -- Skip if the lead is in Screening stage (came from application submission)
  -- Screening stage ID: a4e162e0-5421-4d17-8ad5-4b1195bbc995
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995' THEN
    RAISE NOTICE 'Skipping lead_created automations for lead % in Screening stage', NEW.id;
    RETURN NEW;
  END IF;

  -- Find and execute all active lead_created task automations
  FOR automation IN 
    SELECT * FROM public.task_automations 
    WHERE trigger_type = 'lead_created' AND is_active = true
  LOOP
    -- Create task for this automation
    INSERT INTO public.tasks (
      title,
      description,
      borrower_id,
      assigned_to,
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
    )
    RETURNING id INTO task_id;
    
    -- Update automation execution count
    UPDATE public.task_automations 
    SET 
      execution_count = COALESCE(execution_count, 0) + 1,
      last_run_at = NOW()
    WHERE id = automation.id;
    
    RAISE NOTICE 'Created task % for automation % on lead %', task_id, automation.id, NEW.id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;