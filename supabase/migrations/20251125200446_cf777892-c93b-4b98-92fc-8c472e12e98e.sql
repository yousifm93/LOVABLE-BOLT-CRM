-- Update execute_date_based_automations to support NOT condition operator
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
  condition_operator text;
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
      condition_operator := COALESCE(automation.trigger_config->>'condition_operator', 'equals');
      
      -- Calculate target date (today + offset)
      target_date := CURRENT_DATE + (days_offset || ' days')::interval;
      
      -- Build dynamic query to find matching leads
      IF condition_operator = 'not_equals' THEN
        FOR lead IN EXECUTE format(
          'SELECT id FROM public.leads 
           WHERE DATE(%I) = $1 
           AND ($2::text IS NULL OR %I::text <> $3)',
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
      ELSE
        -- Original equals logic
        FOR lead IN EXECUTE format(
          'SELECT id FROM public.leads 
           WHERE DATE(%I) = $1 
           AND ($2::text IS NULL OR %I::text = $3)',
          date_field,
          COALESCE(condition_field, 'id')
        ) USING target_date, condition_field, condition_value
        LOOP
          IF NOT EXISTS (
            SELECT 1 FROM public.task_automation_executions
            WHERE automation_id = automation.id
              AND lead_id = lead.id
              AND executed_at >= CURRENT_DATE
              AND success = true
          ) THEN
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
      END IF;

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

-- Create package_status changed trigger function
CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    FOR automation IN
      SELECT *
      FROM public.task_automations
      WHERE is_active = true
        AND trigger_type = 'status_changed'
        AND trigger_config->>'field' = 'package_status'
        AND trigger_config->>'target_status' = NEW.package_status::text
    LOOP
      BEGIN
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
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
          'Working on it',
          automation.created_by,
          COALESCE(automation.completion_requirement_type, 'none')
        )
        RETURNING id INTO new_task_id;

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
$function$;

-- Create trigger for package_status changes
DROP TRIGGER IF EXISTS trg_package_status_changed ON public.leads;
CREATE TRIGGER trg_package_status_changed
  AFTER UPDATE OF package_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_package_status_changed_automations();

-- Insert the 3 new automations
-- 1. F/U on Appraisal Report (date_based with NOT condition)
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
  due_date_offset_days
) VALUES (
  'F/U on Appraisal Report',
  'date_based',
  '{"date_field": "appr_eta", "days_offset": 0, "condition_field": "appraisal_status", "condition_value": "Received", "condition_operator": "not_equals"}'::jsonb,
  'F/U on Appraisal Report',
  'Follow up on appraisal report - ETA arrived but status not yet received',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  'active_loan',
  'appraisal',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  0
);

-- 2. PKG Finalized - Call BRWR (status_changed)
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
  due_date_offset_days
) VALUES (
  'PKG Finalized - Call BRWR',
  'status_changed',
  '{"field": "package_status", "target_status": "Final"}'::jsonb,
  'PKG Finalized - Call BRWR',
  'Call borrower when package is finalized',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  'active_loan',
  'closing',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  0
);

-- 3. F/U on Title Work (date_based with NOT condition)
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
  due_date_offset_days
) VALUES (
  'F/U on Title Work',
  'date_based',
  '{"date_field": "title_eta", "days_offset": 0, "condition_field": "title_status", "condition_value": "Received", "condition_operator": "not_equals"}'::jsonb,
  'F/U on Title Work',
  'Follow up on title work - ETA arrived but status not yet received',
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'High',
  'active_loan',
  'closing',
  true,
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  0
);