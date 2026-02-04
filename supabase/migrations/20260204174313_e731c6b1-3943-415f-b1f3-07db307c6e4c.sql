-- Migration 1: Fix pipeline_stage_changed trigger
-- Key fixes: Query trigger_type = 'pipeline_stage_changed', match by target_stage_id, use correct columns

CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- YM
  actual_assignee_id uuid;
  new_stage_name text;
BEGIN
  -- Only proceed if pipeline_stage_id actually changed
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    -- Get the new stage name for logging purposes
    SELECT name INTO new_stage_name FROM pipeline_stages WHERE id = NEW.pipeline_stage_id;
    
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'pipeline_stage_changed'
        AND (ta.trigger_config->>'target_stage_id')::uuid = NEW.pipeline_stage_id
    LOOP
      BEGIN
        -- Check for duplicate (same lead, same automation, not done, within 14 days)
        IF EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id
            AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done')
            AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          -- Log skipped duplicate
          INSERT INTO task_automation_executions (
            automation_id, lead_id, task_id, executed_at, success, error_message
          ) VALUES (
            automation_record.id, NEW.id, NULL, now(), false, 'Skipped: duplicate task exists within 14 days'
          );
          CONTINUE;
        END IF;
        
        -- Determine assignee with fallback
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
        
        -- Insert task WITHOUT status/priority to use DB defaults
        INSERT INTO tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          due_date,
          automation_id
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          NEW.id,
          actual_assignee_id,
          CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval,
          automation_record.id
        )
        RETURNING id INTO new_task_id;
        
        -- Log success
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation_record.id, NEW.id, new_task_id, now(), true
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log failure with error message
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation_record.id, NEW.id, NULL, now(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_pipeline_stage_changed_automations ON leads;
CREATE TRIGGER trigger_pipeline_stage_changed_automations
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_pipeline_stage_changed_automations();


-- Migration 2: Fix appraisal_status trigger
-- Key fixes: Use correct columns, case-insensitive matching, omit status/priority

CREATE OR REPLACE FUNCTION public.execute_appraisal_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- YM
  actual_assignee_id uuid;
BEGIN
  -- Only proceed if appraisal_status actually changed
  IF OLD.appraisal_status IS DISTINCT FROM NEW.appraisal_status THEN
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'appraisal_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.appraisal_status::text)
    LOOP
      BEGIN
        -- Check for duplicate
        IF EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id
            AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done')
            AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          INSERT INTO task_automation_executions (
            automation_id, lead_id, task_id, executed_at, success, error_message
          ) VALUES (
            automation_record.id, NEW.id, NULL, now(), false, 'Skipped: duplicate task exists within 14 days'
          );
          CONTINUE;
        END IF;
        
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
        
        INSERT INTO tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          due_date,
          automation_id
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          NEW.id,
          actual_assignee_id,
          CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval,
          automation_record.id
        )
        RETURNING id INTO new_task_id;
        
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation_record.id, NEW.id, new_task_id, now(), true
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation_record.id, NEW.id, NULL, now(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_appraisal_status_changed_automations ON leads;
CREATE TRIGGER trigger_appraisal_status_changed_automations
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_appraisal_status_changed_automations();


-- Migration 3: Fix package_status trigger
-- Key fix: Query trigger_type = 'status_changed' AND field = 'package_status'

CREATE OR REPLACE FUNCTION public.execute_package_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
  actual_assignee_id uuid;
BEGIN
  IF OLD.package_status IS DISTINCT FROM NEW.package_status THEN
    FOR automation_record IN
      SELECT ta.* 
      FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'package_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.package_status::text)
    LOOP
      BEGIN
        IF EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id
            AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done')
            AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          INSERT INTO task_automation_executions (
            automation_id, lead_id, task_id, executed_at, success, error_message
          ) VALUES (
            automation_record.id, NEW.id, NULL, now(), false, 'Skipped: duplicate task exists within 14 days'
          );
          CONTINUE;
        END IF;
        
        actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
        
        INSERT INTO tasks (
          title,
          description,
          borrower_id,
          assignee_id,
          due_date,
          automation_id
        ) VALUES (
          automation_record.task_name,
          automation_record.task_description,
          NEW.id,
          actual_assignee_id,
          CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval,
          automation_record.id
        )
        RETURNING id INTO new_task_id;
        
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success
        ) VALUES (
          automation_record.id, NEW.id, new_task_id, now(), true
        );
        
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (
          automation_id, lead_id, task_id, executed_at, success, error_message
        ) VALUES (
          automation_record.id, NEW.id, NULL, now(), false, SQLERRM
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_package_status_changed_automations ON leads;
CREATE TRIGGER trigger_package_status_changed_automations
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_package_status_changed_automations();


-- Migration 4: Create generic status handler for hoi_status, title_status, condo_status, cd_status, rate_lock_expiration

CREATE OR REPLACE FUNCTION public.execute_generic_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
  actual_assignee_id uuid;
  field_name text;
  old_value text;
  new_value text;
BEGIN
  -- Check each of the 5 fields that need handling
  -- HOI Status
  IF OLD.hoi_status IS DISTINCT FROM NEW.hoi_status THEN
    FOR automation_record IN
      SELECT ta.* FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'hoi_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.hoi_status::text)
    LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done') AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
          INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
          VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
            CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
          RETURNING id INTO new_task_id;
          INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
          VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
        VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
      END;
    END LOOP;
  END IF;

  -- Title Status
  IF OLD.title_status IS DISTINCT FROM NEW.title_status THEN
    FOR automation_record IN
      SELECT ta.* FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'title_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.title_status::text)
    LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done') AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
          INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
          VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
            CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
          RETURNING id INTO new_task_id;
          INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
          VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
        VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
      END;
    END LOOP;
  END IF;

  -- Condo Status
  IF OLD.condo_status IS DISTINCT FROM NEW.condo_status THEN
    FOR automation_record IN
      SELECT ta.* FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'condo_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.condo_status::text)
    LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done') AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
          INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
          VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
            CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
          RETURNING id INTO new_task_id;
          INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
          VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
        VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
      END;
    END LOOP;
  END IF;

  -- CD Status
  IF OLD.cd_status IS DISTINCT FROM NEW.cd_status THEN
    FOR automation_record IN
      SELECT ta.* FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'cd_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.cd_status::text)
    LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done') AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
          INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
          VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
            CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
          RETURNING id INTO new_task_id;
          INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
          VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
        VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
      END;
    END LOOP;
  END IF;

  -- Rate Lock Expiration (when rate_lock_expiration is set/changed)
  IF OLD.lock_expiration_date IS DISTINCT FROM NEW.lock_expiration_date AND NEW.lock_expiration_date IS NOT NULL THEN
    FOR automation_record IN
      SELECT ta.* FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'rate_lock_expiration'
    LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done') AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
          INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
          VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
            CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
          RETURNING id INTO new_task_id;
          INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
          VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
        VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_generic_status_changed_automations ON leads;
CREATE TRIGGER trigger_generic_status_changed_automations
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_generic_status_changed_automations();


-- Migration 5: Fix epo_status trigger (same pattern)

CREATE OR REPLACE FUNCTION public.execute_epo_status_changed_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
  actual_assignee_id uuid;
BEGIN
  IF OLD.epo_status IS DISTINCT FROM NEW.epo_status THEN
    FOR automation_record IN
      SELECT ta.* FROM task_automations ta
      WHERE ta.is_active = true
        AND ta.trigger_type = 'status_changed'
        AND (ta.trigger_config->>'field')::text = 'epo_status'
        AND upper((ta.trigger_config->>'target_status')::text) = upper(NEW.epo_status::text)
    LOOP
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.borrower_id = NEW.id AND t.automation_id = automation_record.id
            AND t.status::text NOT IN ('Done') AND t.deleted_at IS NULL
            AND t.created_at > NOW() - INTERVAL '14 days'
        ) THEN
          actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
          INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
          VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
            CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
          RETURNING id INTO new_task_id;
          INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
          VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
        END IF;
      EXCEPTION WHEN OTHERS THEN
        INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
        VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_epo_status_changed_automations ON leads;
CREATE TRIGGER trigger_epo_status_changed_automations
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_epo_status_changed_automations();


-- Fix lead_created trigger (same pattern)

CREATE OR REPLACE FUNCTION public.execute_lead_created_automations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  automation_record RECORD;
  new_task_id uuid;
  fallback_user_id uuid := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e';
  actual_assignee_id uuid;
BEGIN
  FOR automation_record IN
    SELECT ta.* FROM task_automations ta
    WHERE ta.is_active = true
      AND ta.trigger_type = 'lead_created'
  LOOP
    BEGIN
      actual_assignee_id := COALESCE(automation_record.assigned_to_user_id, NEW.teammate_assigned, fallback_user_id);
      INSERT INTO tasks (title, description, borrower_id, assignee_id, due_date, automation_id)
      VALUES (automation_record.task_name, automation_record.task_description, NEW.id, actual_assignee_id,
        CURRENT_DATE + (COALESCE(automation_record.due_date_offset_days, 0) || ' days')::interval, automation_record.id)
      RETURNING id INTO new_task_id;
      INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success)
      VALUES (automation_record.id, NEW.id, new_task_id, now(), true);
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO task_automation_executions (automation_id, lead_id, task_id, executed_at, success, error_message)
      VALUES (automation_record.id, NEW.id, NULL, now(), false, SQLERRM);
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_lead_created_automations ON leads;
CREATE TRIGGER trigger_lead_created_automations
  AFTER INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION execute_lead_created_automations();