-- ========================================
-- FIX: Lead Creation Automations - Map auth UUID to CRM user ID
-- ========================================
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
  -- NEW.created_by is the auth.users UUID, we need the public.users ID
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
      -- Use teammate_assigned if available, otherwise use automation default
      assignee_id_value := COALESCE(NEW.teammate_assigned, automation.assigned_to_user_id);
      
      INSERT INTO public.tasks (
        id,
        title,
        description,
        status,
        priority,
        assignee_id,
        due_date,
        created_by,
        borrower_id,
        category
      )
      VALUES (
        gen_random_uuid(),
        automation.task_name,
        automation.task_description,
        'pending',
        automation.task_priority,
        assignee_id_value,
        CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
        v_crm_user_id, -- Use CRM user ID, not auth UUID
        NEW.id,
        'lead_status'
      )
      RETURNING id INTO new_task_id;
      
      -- Update execution count
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

-- ========================================
-- FIX: Pipeline Stage Changed Automations - Map auth UUID to CRM user ID + support teammate fallback
-- ========================================
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
    -- Get the current user ID from JWT claims
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      -- Map auth user ID to CRM user ID
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
        -- Use automation's assigned_to_user_id, fallback to lead's teammate_assigned
        assignee_id_value := COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned);
        
        INSERT INTO public.tasks (
          id,
          title,
          description,
          status,
          priority,
          assignee_id,
          due_date,
          created_by,
          borrower_id,
          category
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'pending',
          automation.task_priority,
          assignee_id_value,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id, -- Use CRM user ID, not auth UUID
          NEW.id,
          'lead_status'
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

-- ========================================
-- FIX: Disclosure Status Changed Automations - Use correct trigger_type
-- ========================================
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
    -- Get the current user ID from JWT claims
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      -- Map auth user ID to CRM user ID
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
          id,
          title,
          description,
          status,
          priority,
          assignee_id,
          due_date,
          created_by,
          borrower_id,
          category
        )
        VALUES (
          gen_random_uuid(),
          automation.task_name,
          automation.task_description,
          'pending',
          automation.task_priority,
          COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned),
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          v_crm_user_id,
          NEW.id,
          'active_loan'
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

-- ========================================
-- FIX: Loan Status Changed Automations - Add condition_field support for Condo
-- ========================================
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
    -- Get the current user ID from JWT claims
    BEGIN
      v_user_id := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
      -- Map auth user ID to CRM user ID
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
      BEGIN
        -- Check if there's a condition field requirement
        condition_met := true;
        IF automation.trigger_config->>'condition_field' IS NOT NULL THEN
          -- Currently only support property_type condition
          IF automation.trigger_config->>'condition_field' = 'property_type' THEN
            condition_met := LOWER(COALESCE(NEW.property_type, '')) ILIKE '%' || LOWER(automation.trigger_config->>'condition_value') || '%';
          END IF;
        END IF;
        
        IF condition_met THEN
          INSERT INTO public.tasks (
            id,
            title,
            description,
            status,
            priority,
            assignee_id,
            due_date,
            created_by,
            borrower_id,
            category
          )
          VALUES (
            gen_random_uuid(),
            automation.task_name,
            automation.task_description,
            'pending',
            automation.task_priority,
            COALESCE(automation.assigned_to_user_id, NEW.teammate_assigned),
            CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
            v_crm_user_id,
            NEW.id,
            'active_loan'
          )
          RETURNING id INTO new_task_id;
          
          UPDATE public.task_automations 
          SET execution_count = COALESCE(execution_count, 0) + 1,
              last_run_at = now()
          WHERE id = automation.id;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Error executing loan_status automation %: %', automation.id, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- ========================================
-- NEW AUTOMATION: Home Search Check In (HSCI) - 7 days after Pre-Qualified
-- ========================================
INSERT INTO task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  due_date_offset_days,
  is_active
) VALUES (
  'Home Search Check In (HSCI)',
  'pipeline_stage_changed',
  '{"target_stage_id": "09162eec-d2b2-48e5-86d0-9e66ee8b2af7"}'::jsonb,
  'Home Search Check In (HSCI)',
  'Follow up with borrower on their home search progress',
  'High',
  NULL, -- Will use lead's teammate_assigned as fallback
  7,
  true
) ON CONFLICT DO NOTHING;

-- ========================================
-- NEW AUTOMATION: Order Title Work - When loan_status = RFP
-- ========================================
INSERT INTO task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  due_date_offset_days,
  is_active
) VALUES (
  'Order Title Work',
  'status_changed',
  '{"field": "loan_status", "target_status": "RFP"}'::jsonb,
  'Order Title Work',
  'Order title work for this loan',
  'High',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a', -- Ashley
  0,
  true
) ON CONFLICT DO NOTHING;

-- ========================================
-- NEW AUTOMATION: Condo Approval - When loan_status = RFP AND property_type = Condo
-- ========================================
INSERT INTO task_automations (
  name,
  trigger_type,
  trigger_config,
  task_name,
  task_description,
  task_priority,
  assigned_to_user_id,
  due_date_offset_days,
  is_active
) VALUES (
  'Condo Approval',
  'status_changed',
  '{"field": "loan_status", "target_status": "RFP", "condition_field": "property_type", "condition_value": "Condo"}'::jsonb,
  'Condo Approval',
  'Order condo docs',
  'High',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a', -- Ashley
  0,
  true
) ON CONFLICT DO NOTHING;