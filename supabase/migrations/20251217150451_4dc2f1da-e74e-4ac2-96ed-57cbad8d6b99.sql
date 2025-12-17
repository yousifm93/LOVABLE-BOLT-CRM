-- Update execute_date_based_automations to filter by pipeline stage based on category
CREATE OR REPLACE FUNCTION public.execute_date_based_automations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  -- Pipeline stage UUIDs
  past_clients_stage_id uuid := '6f8d8f8c-0b0a-4f1a-8a1a-8e8d8f8c0b0a'; -- Past Clients stage
  active_stage_id uuid := '76eb2e82-e1d9-4f2d-a57d-2120a25696db'; -- Active stage
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
      
      -- Build dynamic query to find matching leads with category-based pipeline filtering
      IF condition_operator = 'not_equals' THEN
        FOR lead IN EXECUTE format(
          'SELECT id FROM public.leads 
           WHERE DATE(%I) = $1 
           AND ($2::text IS NULL OR %I::text <> $3)
           AND (
             ($4 = ''past_client'' AND pipeline_stage_id = $5) OR
             ($4 = ''active_loan'' AND pipeline_stage_id = $6) OR
             ($4 IS NULL OR $4 NOT IN (''past_client'', ''active_loan''))
           )',
          date_field,
          COALESCE(condition_field, 'id')
        ) USING target_date, condition_field, condition_value, automation.category, past_clients_stage_id, active_stage_id
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
        -- Original equals logic with pipeline filtering
        FOR lead IN EXECUTE format(
          'SELECT id FROM public.leads 
           WHERE DATE(%I) = $1 
           AND ($2::text IS NULL OR %I::text = $3)
           AND (
             ($4 = ''past_client'' AND pipeline_stage_id = $5) OR
             ($4 = ''active_loan'' AND pipeline_stage_id = $6) OR
             ($4 IS NULL OR $4 NOT IN (''past_client'', ''active_loan''))
           )',
          date_field,
          COALESCE(condition_field, 'id')
        ) USING target_date, condition_field, condition_value, automation.category, past_clients_stage_id, active_stage_id
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