-- Add 'scheduled' trigger type to constraint
ALTER TABLE public.task_automations 
  DROP CONSTRAINT IF EXISTS task_automations_trigger_type_check;

ALTER TABLE public.task_automations
  ADD CONSTRAINT task_automations_trigger_type_check
  CHECK (trigger_type IN ('lead_created', 'status_changed', 'pipeline_stage_changed', 'scheduled'));

-- Add column to track last execution for scheduled automations
ALTER TABLE public.task_automations
  ADD COLUMN IF NOT EXISTS last_scheduled_execution timestamptz;

-- Enable pg_cron for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function to be called by cron job
CREATE OR REPLACE FUNCTION public.execute_scheduled_automations()
RETURNS jsonb AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
  current_hour int;
  current_day_of_week int; -- 0=Sunday, 1=Monday, ..., 6=Saturday
  current_day_of_month int;
  schedule_config jsonb;
  should_execute boolean;
  tasks_created int := 0;
BEGIN
  -- Get current time components
  current_hour := EXTRACT(HOUR FROM NOW());
  current_day_of_week := EXTRACT(DOW FROM NOW());
  current_day_of_month := EXTRACT(DAY FROM NOW());

  -- Loop through active scheduled automations
  FOR automation IN
    SELECT *
    FROM public.task_automations
    WHERE is_active = true
      AND trigger_type = 'scheduled'
  LOOP
    schedule_config := automation.trigger_config;
    should_execute := false;

    -- Check if this automation should execute now
    -- Based on frequency, day, and time in trigger_config
    
    -- Check if scheduled_hour matches current hour
    IF (schedule_config->>'scheduled_hour')::int = current_hour THEN
      
      -- Daily frequency
      IF schedule_config->>'frequency' = 'daily' THEN
        should_execute := true;
      
      -- Weekly frequency (specific day of week)
      ELSIF schedule_config->>'frequency' = 'weekly' THEN
        IF (schedule_config->>'day_of_week')::int = current_day_of_week THEN
          should_execute := true;
        END IF;
      
      -- Monthly frequency (specific day of month)
      ELSIF schedule_config->>'frequency' = 'monthly' THEN
        IF (schedule_config->>'day_of_month')::int = current_day_of_month THEN
          should_execute := true;
        END IF;
      
      -- First [day] of month (e.g., first Friday)
      ELSIF schedule_config->>'frequency' = 'monthly_first_weekday' THEN
        -- Check if today is the specified day of week AND it's in the first week
        IF (schedule_config->>'day_of_week')::int = current_day_of_week 
           AND current_day_of_month <= 7 THEN
          should_execute := true;
        END IF;
      END IF;
    END IF;

    -- Prevent duplicate execution within the same hour
    IF should_execute THEN
      IF automation.last_scheduled_execution IS NULL 
         OR automation.last_scheduled_execution < (NOW() - INTERVAL '1 hour') THEN
        
        BEGIN
          -- Create the task (NBT - no borrower_id)
          INSERT INTO public.tasks (
            title,
            description,
            borrower_id,  -- NULL for NBT
            assignee_id,
            priority,
            due_date,
            status,
            created_by
          )
          VALUES (
            automation.task_name,
            automation.task_description,
            NULL,  -- NBT (non-borrower task)
            automation.assigned_to_user_id,
            automation.task_priority::task_priority,
            CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
            'Working on it',
            automation.created_by
          )
          RETURNING id INTO new_task_id;

          -- Update last execution time
          UPDATE public.task_automations
          SET last_scheduled_execution = NOW()
          WHERE id = automation.id;

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
            NULL,  -- No lead for scheduled tasks
            new_task_id,
            NOW(),
            true
          );

          tasks_created := tasks_created + 1;

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
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'tasks_created', tasks_created,
    'executed_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule the cron job to run every hour at the top of the hour
SELECT cron.schedule(
  'execute-scheduled-task-automations',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.execute_scheduled_automations();
  $$
);

-- Seed 6 scheduled automations
DO $$
DECLARE
  yousif_id uuid;
BEGIN
  SELECT id INTO yousif_id FROM auth.users WHERE email = 'yousif@arrive.capital';

  -- 1. First Friday of every month at 6:00 AM - Choose featured agents
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Choose featured agents',
    'scheduled',
    '{"frequency": "monthly_first_weekday", "day_of_week": 5, "scheduled_hour": 6}'::jsonb,
    'Choose featured agents',
    'Select featured agents for the month',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 2. Every Monday at 6:00 AM - Email mortgage Monday
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Email mortgage Monday',
    'scheduled',
    '{"frequency": "weekly", "day_of_week": 1, "scheduled_hour": 6}'::jsonb,
    'Email mortgage Monday',
    'Send out the weekly Mortgage Monday email',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 3. Every Thursday at 6:00 AM - Complete Friday newsletter
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Complete Friday newsletter',
    'scheduled',
    '{"frequency": "weekly", "day_of_week": 4, "scheduled_hour": 6}'::jsonb,
    'Complete Friday newsletter',
    'Finish the Friday newsletter for this week',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 4. First of the month at 6:00 AM - Update all contacts and email campaigns
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Update all contacts and email campaigns',
    'scheduled',
    '{"frequency": "monthly", "day_of_month": 1, "scheduled_hour": 6}'::jsonb,
    'Update all contacts and email campaigns',
    'Review and update all contacts and email campaign lists',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 5. Every Wednesday at 6:00 AM - Send out condo marketing
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Send out condo marketing',
    'scheduled',
    '{"frequency": "weekly", "day_of_week": 3, "scheduled_hour": 6}'::jsonb,
    'Send out condo marketing',
    'Send weekly condo marketing materials',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );

  -- 6. First of the month at 6:00 AM - Update condo list
  INSERT INTO public.task_automations (
    name, trigger_type, trigger_config,
    task_name, task_description,
    assigned_to_user_id, task_priority, due_date_offset_days,
    is_active, created_by
  ) VALUES (
    'Update condo list',
    'scheduled',
    '{"frequency": "monthly", "day_of_month": 1, "scheduled_hour": 6}'::jsonb,
    'Update condo list',
    'Update and verify the condo approval list',
    yousif_id, 'Medium', 0,
    true, yousif_id
  );
END $$;