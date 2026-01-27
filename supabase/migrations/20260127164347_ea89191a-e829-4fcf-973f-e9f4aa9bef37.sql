-- Issue 2 & 3: Fix "Follow up on new lead" automation - set due date to today and remove hardcoded assignee
UPDATE task_automations 
SET due_date_offset_days = 0,
    assigned_to_user_id = NULL
WHERE id = '30c8ebeb-b9e0-4347-b541-0e2eb755ac2a';

-- Issue 3: Update execute_lead_created_automations trigger to prefer lead creator over automation assignee
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  assignee_id_value uuid;
BEGIN
  -- Only run for new leads (INSERT)
  FOR automation IN
    SELECT * FROM public.task_automations
    WHERE is_active = true
      AND trigger_type = 'lead_created'
  LOOP
    BEGIN
      -- Prefer lead's teammate_assigned (creator), fall back to automation's assigned_to
      assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
      
      INSERT INTO public.tasks (
        title,
        description,
        borrower_id,
        assignee_id,
        priority,
        due_date,
        status,
        created_by,
        completion_requirement_type,
        automation_id
      )
      VALUES (
        automation.task_name,
        automation.task_description,
        NEW.id,
        assignee_id_value,
        automation.task_priority::task_priority,
        CURRENT_DATE + (COALESCE(automation.due_date_offset_days, 0) || ' days')::interval,
        'Working on it',
        NEW.created_by,
        COALESCE(automation.completion_requirement_type, 'none'),
        automation.id
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
  
  RETURN NEW;
END;
$function$;

-- Issue 4: Create "Call Borrower - New Active File" automation
INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active,
  category, completion_requirement_type
) VALUES (
  'Call Borrower - New Active File',
  'status_changed',
  '{"field": "loan_status", "target_status": "New"}',
  'Call Borrower - New Active File',
  'Call the borrower to welcome them to active status and discuss next steps',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee',
  'High',
  0,
  true,
  'active_loan',
  'log_call_borrower'
);

-- Issue 4: Create "Call Buyer's Agent - New Active File" automation
INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active,
  category, completion_requirement_type
) VALUES (
  'Call Buyers Agent - New Active File',
  'status_changed',
  '{"field": "loan_status", "target_status": "New"}',
  'Call Buyers Agent - New Active File',
  'Call the buyers agent to introduce yourself and coordinate on the active file',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee',
  'High',
  0,
  true,
  'active_loan',
  'log_call_buyer_agent'
);