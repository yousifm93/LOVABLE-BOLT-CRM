-- Add 'date_based' to trigger type constraint
ALTER TABLE public.task_automations 
  DROP CONSTRAINT IF EXISTS task_automations_trigger_type_check;

ALTER TABLE public.task_automations
  ADD CONSTRAINT task_automations_trigger_type_check
  CHECK (trigger_type IN ('lead_created', 'status_changed', 'pipeline_stage_changed', 'scheduled', 'date_based'));

-- Create function to execute date-based automations
CREATE OR REPLACE FUNCTION public.execute_date_based_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  automation RECORD;
  lead RECORD;
  new_task_id uuid;
  tasks_created int := 0;
  target_date date;
  date_field text;
  days_offset int;
  condition_field text;
  condition_value text;
BEGIN
  -- Loop through active date-based automations
  FOR automation IN
    SELECT *
    FROM public.task_automations
    WHERE is_active = true
      AND trigger_type = 'date_based'
  LOOP
    BEGIN
      -- Parse trigger_config
      date_field := automation.trigger_config->>'date_field';
      days_offset := COALESCE((automation.trigger_config->>'days_offset')::int, 0);
      condition_field := automation.trigger_config->>'condition_field';
      condition_value := automation.trigger_config->>'condition_value';
      
      -- Calculate target date (today + offset)
      target_date := CURRENT_DATE + (days_offset || ' days')::interval;
      
      -- Build dynamic query to find matching leads
      FOR lead IN EXECUTE format(
        'SELECT id FROM public.leads 
         WHERE DATE(%I) = $1 
         AND ($2::text IS NULL OR %I::text = $3)',
        date_field,
        COALESCE(condition_field, 'id')  -- Use id as dummy if no condition
      ) USING target_date, condition_field, condition_value
      LOOP
        -- Check if task already created for this lead/automation combo today
        IF NOT EXISTS (
          SELECT 1 FROM public.task_automation_executions
          WHERE automation_id = automation.id
            AND lead_id = lead.id
            AND executed_at >= CURRENT_DATE
            AND success = true
        ) THEN
          -- Create task
          INSERT INTO public.tasks (
            title,
            description,
            borrower_id,
            assignee_id,
            priority,
            due_date,
            status,
            created_by,
            completion_requirement_type
          )
          VALUES (
            automation.task_name,
            automation.task_description,
            lead.id,
            automation.assigned_to_user_id,
            automation.task_priority::task_priority,
            CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
            'Working on it',
            automation.created_by,
            COALESCE(automation.completion_requirement_type, 'none')
          )
          RETURNING id INTO new_task_id;

          -- Log execution
          INSERT INTO public.task_automation_executions (
            automation_id,
            lead_id,
            task_id,
            executed_at,
            success
          )
          VALUES (
            automation.id,
            lead.id,
            new_task_id,
            NOW(),
            true
          );

          tasks_created := tasks_created + 1;
        END IF;
      END LOOP;

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
        NULL,
        NULL,
        NOW(),
        false,
        SQLERRM
      );
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tasks_created', tasks_created,
    'executed_at', NOW()
  );
END;
$$;

-- Insert the 3 new date-based automations
INSERT INTO public.task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  assigned_to_user_id,
  task_priority,
  category,
  subcategory,
  is_active,
  created_by,
  completion_requirement_type
) VALUES 
(
  'Day Before Closing - Call BA',
  'date_based',
  '{"date_field": "close_date", "days_offset": -1}'::jsonb,
  'Day Before Closing - Call BA',
  'Call the buyer''s agent one day before closing',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  'active_loan',
  'closing',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'none'
),
(
  'Follow-up on Appraisal Scheduling',
  'date_based',
  '{"date_field": "appraisal_ordered_date", "days_offset": 2, "condition_field": "appraisal_status", "condition_value": "Ordered"}'::jsonb,
  'Follow-up on Appraisal Scheduling',
  'Follow up on appraisal scheduling - it''s taking too long to be scheduled',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  'active_loan',
  'appraisal',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'none'
),
(
  'F/U Initial Approval',
  'date_based',
  '{"date_field": "submitted_at", "days_offset": 2, "condition_field": "loan_status", "condition_value": "SUB"}'::jsonb,
  'F/U Initial Approval',
  'Follow up on initial approval - loan should be in AWC status by now',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  'active_loan',
  'submission',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'none'
);

-- Schedule the function to run daily at 6 AM
SELECT cron.schedule(
  'execute-date-based-task-automations',
  '0 6 * * *',
  $$SELECT public.execute_date_based_automations();$$
);