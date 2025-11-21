-- First, alter the check constraint to allow 'pipeline_stage_changed'
ALTER TABLE public.task_automations 
DROP CONSTRAINT IF EXISTS task_automations_trigger_type_check;

ALTER TABLE public.task_automations
ADD CONSTRAINT task_automations_trigger_type_check 
CHECK (trigger_type IN ('lead_created', 'status_changed', 'pipeline_stage_changed'));

-- Create function to execute pipeline stage changed automations
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if pipeline_stage_id actually changed
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    -- Loop through active automations for pipeline stage changes
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
          created_by
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          automation.created_by
        )
        RETURNING id INTO new_task_id;

        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success
        )
        VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          NOW(),
          true
        );

      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          executed_at,
          success,
          error_message
        )
        VALUES (
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for pipeline stage changes
CREATE TRIGGER trigger_pipeline_stage_changed_automations
  AFTER UPDATE OF pipeline_stage_id ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_pipeline_stage_changed_automations();

-- Seed 9 new automation records
DO $$
DECLARE
  yousif_id uuid;
BEGIN
  SELECT id INTO yousif_id FROM auth.users WHERE email = 'yousif@arrive.capital';

  -- 1. Pending App stage
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Follow up on pending app',
    'pipeline_stage_changed',
    '{"target_stage_id": "44d74bfb-c4f3-4f7d-a69e-e47ac67a5945"}'::jsonb,
    'Follow up on pending app',
    'Follow up with the client who just moved to pending app stage',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 2. Screening stage
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Screen new application',
    'pipeline_stage_changed',
    '{"target_stage_id": "a4e162e0-5421-4d17-8ad5-4b1195bbc995"}'::jsonb,
    'Screen new application',
    'Screen the new application that just moved to screening stage',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 3. Pre-Qualified - Call client
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'New pre-qualified client - Call client',
    'pipeline_stage_changed',
    '{"target_stage_id": "09162eec-d2b2-48e5-86d0-9e66ee8b2af7"}'::jsonb,
    'New pre-qualified client - Call client',
    'Call the client to congratulate them on being pre-qualified',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 4. Pre-Qualified - Call buyer's agent
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'New pre-qualified client - Call buyer''s agent',
    'pipeline_stage_changed',
    '{"target_stage_id": "09162eec-d2b2-48e5-86d0-9e66ee8b2af7"}'::jsonb,
    'New pre-qualified client - Call buyer''s agent',
    'Call the buyer''s agent to inform them about the pre-qualification',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 5. Pre-Approved - Call borrower
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'New pre-approved borrower call',
    'pipeline_stage_changed',
    '{"target_stage_id": "3cbf38ff-752e-4163-a9a3-1757499b4945"}'::jsonb,
    'New pre-approved borrower call',
    'Call the borrower to congratulate them on being pre-approved',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 6. Pre-Approved - Call buyer's agent
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'New pre-approved borrower - Call buyer''s agent',
    'pipeline_stage_changed',
    '{"target_stage_id": "3cbf38ff-752e-4163-a9a3-1757499b4945"}'::jsonb,
    'New pre-approved borrower - Call buyer''s agent',
    'Call the buyer''s agent to inform them about the pre-approval',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 7. Active stage
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'New active file - Onboard and disclose',
    'pipeline_stage_changed',
    '{"target_stage_id": "76eb2e82-e1d9-4f2d-a57d-2120a25696db"}'::jsonb,
    'New active file - Onboard and disclose',
    'Onboard the new active file and prepare disclosures',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 8. Past Clients stage (1 day offset)
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Past client call',
    'pipeline_stage_changed',
    '{"target_stage_id": "acdfc6ba-7cbc-47af-a8c6-380d77aef6dd"}'::jsonb,
    'Past client call',
    'Follow up call with past client',
    yousif_id, 'Medium', 1,
    true, yousif_id
  );

END $$;