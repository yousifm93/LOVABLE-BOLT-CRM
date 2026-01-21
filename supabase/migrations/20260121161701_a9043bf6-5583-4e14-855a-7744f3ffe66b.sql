-- Fix the pipeline stage change task automations trigger
-- The issue: trigger function uses 'pipeline_stage_change' but automations use 'pipeline_stage_changed'

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS trigger_pipeline_stage_changed_automations ON public.leads;

-- Create or replace the function with the correct trigger_type matching
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
BEGIN
  -- Only proceed if pipeline_stage_id actually changed
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    -- Get current user ID
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
    END;

    -- Find matching automations - using 'pipeline_stage_changed' to match the task_automations table
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'pipeline_stage_changed'
        AND (trigger_config->>'target_stage_id')::uuid = NEW.pipeline_stage_id
    LOOP
      BEGIN
        -- Create the task
        INSERT INTO public.tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          priority,
          due_date,
          status,
          created_by,
          automation_id,
          completion_requirement_type
        ) VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          COALESCE(automation.task_priority, 'Medium')::task_priority,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          'To Do'::task_status,
          v_user_id,
          automation.id,
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;

        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success
        ) VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          NOW(),
          true
        );

        -- Update automation stats
        UPDATE public.task_automations
        SET last_run_at = NOW(),
            execution_count = COALESCE(execution_count, 0) + 1
        WHERE id = automation.id;

      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          error_message
        ) VALUES (
          automation.id,
          NEW.id,
          NULL,
          NOW(),
          false,
          SQLERRM
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger on leads table
CREATE TRIGGER trigger_pipeline_stage_changed_automations
  AFTER UPDATE OF pipeline_stage_id ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_pipeline_stage_changed_automations();