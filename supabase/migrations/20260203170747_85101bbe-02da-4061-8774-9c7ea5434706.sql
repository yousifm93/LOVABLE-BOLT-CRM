-- Fix task status value in all automation trigger functions
-- The status 'pending' is not a valid task_status enum value
-- Valid values: 'To Do', 'In Progress', 'Done', 'Working on it', 'Need help'

-- Fix execute_lead_created_automations
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
  v_crm_user_id uuid;
BEGIN
  -- Map auth user ID to CRM user ID for created_by
  SELECT id INTO v_crm_user_id 
  FROM users 
  WHERE auth_user_id = NEW.created_by 
  LIMIT 1;

  FOR automation IN
    SELECT * FROM public.task_automations
    WHERE is_active = true
      AND trigger_type = 'lead_created'
  LOOP
    BEGIN
      assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
      
      INSERT INTO public.tasks (
        id, title, description, status, priority,
        assignee_id, due_date, created_by, borrower_id
      )
      VALUES (
        gen_random_uuid(),
        automation.task_name,
        automation.task_description,
        'To Do',
        automation.task_priority,
        assignee_id_value,
        CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
        v_crm_user_id,
        NEW.id
      )
      RETURNING id INTO new_task_id;
      
      UPDATE public.task_automations 
      SET execution_count = COALESCE(execution_count, 0) + 1,
          last_run_at = now()
      WHERE id = automation.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Error executing lead_created automation %: %', automation.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Fix execute_pipeline_stage_changed_automations
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
  assignee_id_value uuid;
BEGIN
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'pipeline_stage_changed'
        AND ta.trigger_config->>'target_stage_id' = NEW.pipeline_stage_id::text
    LOOP
      BEGIN
        assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);
        
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',
          automation.task_priority,
          assignee_id_value,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id
        )
        RETURNING id INTO new_task_id;
        
        UPDATE public.task_automations 
        SET execution_count = COALESCE(execution_count, 0) + 1,
            last_run_at = now()
        WHERE id = automation.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing pipeline_stage_changed automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix execute_disclosure_status_changed_automations  
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
BEGIN
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'disclosure_status'
        AND ta.trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      BEGIN
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',
          automation.task_priority,
          COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned),
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id
        )
        RETURNING id INTO new_task_id;
        
        UPDATE public.task_automations 
        SET execution_count = COALESCE(execution_count, 0) + 1,
            last_run_at = now()
        WHERE id = automation.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing disclosure_status automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Fix execute_loan_status_changed_automations
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
  condition_met boolean;
BEGIN
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      SELECT id INTO v_crm_user_id 
      FROM users 
      WHERE auth_user_id = v_user_id 
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_user_id := NULL;
      v_crm_user_id := NULL;
    END;
    
    FOR automation IN
      SELECT ta.*
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND ta.trigger_config->>'field' = 'loan_status'
        AND LOWER(ta.trigger_config->>'target_status') = LOWER(NEW.loan_status::text)
    LOOP
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
        INSERT INTO public.tasks (
          id, title, description, status, priority,
          assignee_id, due_date, created_by, borrower_id
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'To Do',
          automation.task_priority,
          COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned),
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id
        )
        RETURNING id INTO new_task_id;
        
        UPDATE public.task_automations 
        SET execution_count = COALESCE(execution_count, 0) + 1,
            last_run_at = now()
        WHERE id = automation.id;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing loan_status automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;