-- Create function to execute task automations when appraisal status changes
CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  target_status TEXT;
BEGIN
  -- Only proceed if appraisal_status actually changed
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    
    -- Loop through all active status_changed automations for appraisal_status
    FOR automation IN 
      SELECT * FROM public.task_automations 
      WHERE trigger_type = 'status_changed' 
        AND is_active = true
        AND (trigger_config->>'field')::text = 'appraisal_status'
    LOOP
      -- Get the target status from trigger_config
      target_status := (automation.trigger_config->>'target_status')::text;
      
      -- Check if the new status matches the target status
      IF NEW.appraisal_status::text = target_status THEN
        BEGIN
          -- Create the task
          INSERT INTO public.tasks (
            borrower_id,
            title,
            description,
            assignee_id,
            priority,
            status,
            due_date,
            created_at
          ) VALUES (
            NEW.id,
            automation.task_name,
            automation.task_description,
            automation.assigned_to_user_id,
            automation.task_priority,
            'Working on it'::task_status,
            CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
            now()
          )
          RETURNING id INTO new_task_id;
          
          -- Log successful execution
          INSERT INTO public.task_automation_executions (
            automation_id,
            lead_id,
            task_id,
            success
          ) VALUES (
            automation.id,
            NEW.id,
            new_task_id,
            true
          );
          
        EXCEPTION WHEN OTHERS THEN
          -- Log failed execution
          INSERT INTO public.task_automation_executions (
            automation_id,
            lead_id,
            task_id,
            success,
            error_message
          ) VALUES (
            automation.id,
            NEW.id,
            NULL,
            false,
            SQLERRM
          );
        END;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on leads table for appraisal status changes
DROP TRIGGER IF EXISTS trigger_appraisal_status_changed_automations ON public.leads;
CREATE TRIGGER trigger_appraisal_status_changed_automations
  AFTER UPDATE OF appraisal_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_appraisal_status_changed_automations();

-- Get Yousif's user ID and seed the 4 appraisal status automations
DO $$
DECLARE
  yousif_id UUID;
BEGIN
  -- Get Yousif's ID
  SELECT id INTO yousif_id FROM users WHERE email = 'yousif@arrive.capital' LIMIT 1;
  
  -- Insert the 4 appraisal status automations
  
  -- 1. Appraisal Received - Call Buyer's Agent
  INSERT INTO public.task_automations (
    name,
    trigger_type,
    trigger_config,
    task_name,
    task_description,
    assigned_to_user_id,
    task_priority,
    is_active,
    created_by
  ) VALUES (
    'Appraisal Received - Call Buyer''s Agent',
    'status_changed',
    '{"field": "appraisal_status", "target_status": "Received"}'::jsonb,
    'APPRAISAL RECEIVED- CALL BA',
    'CALL BUYERS AGENT TO LET THEM KNOW THE APPRAISAL HAS BEEN RECEIVED',
    yousif_id,
    'Medium',
    true,
    yousif_id
  );
  
  -- 2. Appraisal Received - Notify All Parties
  INSERT INTO public.task_automations (
    name,
    trigger_type,
    trigger_config,
    task_name,
    task_description,
    assigned_to_user_id,
    task_priority,
    is_active,
    created_by
  ) VALUES (
    'Appraisal Received - Notify All Parties',
    'status_changed',
    '{"field": "appraisal_status", "target_status": "Received"}'::jsonb,
    'APPRAISAL RECEIVED- NOTIFY ALL PARTIES',
    'SEND OUT ALL PARTIES THE APPRAISED VALUE AFTER IT HAS BEEN RECEIVED',
    yousif_id,
    'Medium',
    true,
    yousif_id
  );
  
  -- 3. Appraisal Scheduled - Call Listing Agent
  INSERT INTO public.task_automations (
    name,
    trigger_type,
    trigger_config,
    task_name,
    task_description,
    assigned_to_user_id,
    task_priority,
    is_active,
    created_by
  ) VALUES (
    'Appraisal Scheduled - Call Listing Agent',
    'status_changed',
    '{"field": "appraisal_status", "target_status": "Scheduled"}'::jsonb,
    'APPRAISAL SCHEDULED - CALL LA',
    'CALL LISTING AGENT TO LET THEM KNOW THE APPRAISAL HAS BEEN SCHEDULED',
    yousif_id,
    'Medium',
    true,
    yousif_id
  );
  
  -- 4. Appraisal Scheduled - Update Time
  INSERT INTO public.task_automations (
    name,
    trigger_type,
    trigger_config,
    task_name,
    task_description,
    assigned_to_user_id,
    task_priority,
    is_active,
    created_by
  ) VALUES (
    'Appraisal Scheduled - Update Appraisal Time',
    'status_changed',
    '{"field": "appraisal_status", "target_status": "Scheduled"}'::jsonb,
    'APPRAISAL SCHEDULED - UPDATE TIME',
    'SEND OUT THE APPRAISAL SCHEDULE INFORMATION TO ALL PARTIES',
    yousif_id,
    'Medium',
    true,
    yousif_id
  );
  
END $$;