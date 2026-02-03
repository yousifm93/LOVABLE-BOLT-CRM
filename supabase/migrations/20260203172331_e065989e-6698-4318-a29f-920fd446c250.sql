-- Fix task automation trigger functions
-- Root cause: Functions were trying to UPDATE execution_count/last_run_at columns that don't exist
-- This caused the entire transaction (including task INSERT) to roll back

-- 1) Fix execute_lead_created_automations
CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_creator_crm_id uuid;
  v_assignee_id uuid;
BEGIN
  -- Map lead creator (auth user) to CRM user ID
  SELECT id INTO v_creator_crm_id 
  FROM public.users 
  WHERE auth_user_id = NEW.created_by 
  LIMIT 1;

  FOR automation IN
    SELECT * FROM public.task_automations
    WHERE is_active = true
      AND trigger_type = 'lead_created'
  LOOP
    BEGIN
      -- Assignee: automation setting, then lead teammate, then creator
      v_assignee_id := COALESCE(
        automation.assigned_to_user_id,
        NEW.teammate_assigned,
        v_creator_crm_id
      );
      
      INSERT INTO public.tasks (
        id, title, description, status, priority,
        assignee_id, due_date, created_by, borrower_id, automation_id
      )
      VALUES (
        gen_random_uuid(),
        automation.task_name,
        automation.task_description,
        'To Do',
        COALESCE(automation.task_priority, 'Medium')::task_priority,
        v_assignee_id,
        CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
        v_creator_crm_id,
        NEW.id,
        automation.id
      )
      RETURNING id INTO new_task_id;
      
      -- Log successful execution
      INSERT INTO public.task_automation_executions (
        automation_id, lead_id, task_id, executed_at, success
      ) VALUES (
        automation.id, NEW.id, new_task_id, NOW(), true
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Log failed execution
      INSERT INTO public.task_automation_executions (
        automation_id, lead_id, task_id, executed_at, success, error_message
      ) VALUES (
        automation.id, NEW.id, NULL, NOW(), false, SQLERRM
      );
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 2) Fix execute_pipeline_stage_changed_automations
CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
  v_assignee_id uuid;
BEGIN
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    -- Get current user's CRM ID
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM public.users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM public.task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'pipeline_stage_changed'
        AND ta.trigger_config->>'target_stage_id' = NEW.pipeline_stage_id::text
    LOOP
      BEGIN
        -- Assignee priority: automation > lead teammate > current user
        v_assignee_id := COALESCE(
          automation.assigned_to_user_id,
          NEW.teammate_assigned,
          v_crm_user_id
        );
        
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id, automation_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',
          COALESCE(automation.task_priority, 'Medium')::task_priority,
          v_assignee_id,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id,
          automation.id
        )
        RETURNING id INTO new_task_id;
        
        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation.id, NEW.id, NULL, NOW(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3) Fix execute_disclosure_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
  v_assignee_id uuid;
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    -- Get current user's CRM ID
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM public.users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM public.task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'disclosure_status'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      BEGIN
        v_assignee_id := COALESCE(
          automation.assigned_to_user_id,
          NEW.teammate_assigned,
          v_crm_user_id
        );
        
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id, automation_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',
          COALESCE(automation.task_priority, 'Medium')::task_priority,
          v_assignee_id,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id,
          automation.id
        )
        RETURNING id INTO new_task_id;
        
        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation.id, NEW.id, NULL, NOW(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4) Fix execute_loan_status_changed_automations
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation RECORD;
  new_task_id uuid;
  v_user_id uuid;
  v_crm_user_id uuid;
  v_assignee_id uuid;
  condition_met boolean;
BEGIN
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    -- Get current user's CRM ID
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM public.users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM public.task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'loan_status'
        AND LOWER(ta.trigger_config->>'target_status') = LOWER(NEW.loan_status::text)
    LOOP
      -- Check condition_field if specified
      condition_met := true;
      IF automation.trigger_config->>'condition_field' IS NOT NULL THEN
        IF automation.trigger_config->>'condition_field' = 'property_type' THEN
          condition_met := LOWER(COALESCE(NEW.property_type, '')) ILIKE '%' || LOWER(automation.trigger_config->>'condition_value') || '%';
        END IF;
      END IF;
      
      IF NOT condition_met THEN
        CONTINUE;
      END IF;
      
      BEGIN
        v_assignee_id := COALESCE(
          automation.assigned_to_user_id,
          NEW.teammate_assigned,
          v_crm_user_id
        );
        
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id, automation_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',
          COALESCE(automation.task_priority, 'Medium')::task_priority,
          v_assignee_id,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id,
          automation.id
        )
        RETURNING id INTO new_task_id;
        
        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation.id, NEW.id, new_task_id, NOW(), true
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation.id, NEW.id, NULL, NOW(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;