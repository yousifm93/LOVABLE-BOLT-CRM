-- Fix the execute_pipeline_stage_changed_automations trigger function
-- The current version incorrectly references OLD.pipeline_stage instead of OLD.pipeline_stage_id

CREATE OR REPLACE FUNCTION public.execute_pipeline_stage_changed_automations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    automation RECORD;
    new_stage_name TEXT;
    old_stage_name TEXT;
    task_due DATE;
    task_assignee_id UUID;
    new_task_id UUID;
    fallback_user_id UUID := '230ccf6d-48f5-4f3c-89fd-f2907ebdba1e'; -- YM
BEGIN
    -- Only run if pipeline_stage_id actually changed
    IF OLD.pipeline_stage_id IS NOT DISTINCT FROM NEW.pipeline_stage_id THEN
        RETURN NEW;
    END IF;
    
    -- Look up stage names from pipeline_stages table
    SELECT name INTO new_stage_name FROM public.pipeline_stages WHERE id = NEW.pipeline_stage_id;
    SELECT name INTO old_stage_name FROM public.pipeline_stages WHERE id = OLD.pipeline_stage_id;
    
    -- Find matching automations
    FOR automation IN 
        SELECT ta.* 
        FROM public.task_automations ta
        WHERE ta.trigger_type = 'status_changed'
          AND ta.is_active = true
          AND (ta.trigger_config->>'target_status')::text = new_stage_name::text
    LOOP
        -- Calculate due date
        task_due := CURRENT_DATE + COALESCE((automation.trigger_config->>'due_days')::int, 0);
        
        -- Get assignee - use automation config or fallback
        task_assignee_id := COALESCE(
            (automation.trigger_config->>'assignee_id')::uuid,
            NEW.teammate_assigned,
            fallback_user_id
        );
        
        -- Check for duplicate (same borrower + same title + not Done)
        IF NOT EXISTS (
            SELECT 1 FROM public.tasks
            WHERE borrower_id = NEW.id
              AND title = automation.task_title
              AND status::text NOT IN ('Done')
              AND deleted_at IS NULL
        ) THEN
            -- Insert new task
            INSERT INTO public.tasks (
                title,
                description,
                borrower_id,
                assignee_id,
                due_date,
                priority,
                status,
                automation_id,
                created_at,
                updated_at
            ) VALUES (
                automation.task_title,
                automation.task_description,
                NEW.id,
                task_assignee_id,
                task_due,
                COALESCE(automation.default_priority, 'Medium')::task_priority,
                'To Do'::task_status,
                automation.id,
                NOW(),
                NOW()
            )
            RETURNING id INTO new_task_id;
            
            -- Insert task assignee record using safe insert function
            PERFORM public.safe_insert_task_assignee(new_task_id, task_assignee_id);
            
            -- Log execution
            INSERT INTO public.task_automation_executions (
                automation_id,
                lead_id,
                task_id,
                executed_at,
                success
            ) VALUES (
                automation.id,
                NEW.id,
                new_task_id,
                NOW(),
                true
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Ensure the trigger is properly attached (recreate to be safe)
DROP TRIGGER IF EXISTS trigger_pipeline_stage_changed_automations ON public.leads;
CREATE TRIGGER trigger_pipeline_stage_changed_automations
    AFTER UPDATE OF pipeline_stage_id ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.execute_pipeline_stage_changed_automations();