-- 1. Borrower intro call (AWC status trigger)
INSERT INTO task_automations (
  name, task_name, task_description, trigger_type, trigger_config, 
  assigned_to_user_id, task_priority, due_date_offset_days, 
  is_active, category, subcategory, completion_requirement_type
) VALUES (
  'Borrower intro call',
  'Borrower intro call',
  'Call the borrower to introduce yourself and request conditions verbally with ETAs',
  'status_changed',
  '{"field": "loan_status", "target_status": "AWC"}',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission',
  'log_call_borrower'
);

-- 2. Order Title Work (Disclosure Signed trigger)
INSERT INTO task_automations (
  name, task_name, task_description, trigger_type, trigger_config,
  assigned_to_user_id, task_priority, due_date_offset_days,
  is_active, category, subcategory, completion_requirement_type
) VALUES (
  'Order Title Work',
  'Order Title Work',
  'Disclosures have been signed. Please order title work.',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Signed"}',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission',
  'compound:title_ordered'
);

-- 3. Order Condo Docs (Disclosure Signed + Condo property type)
INSERT INTO task_automations (
  name, task_name, task_description, trigger_type, trigger_config,
  assigned_to_user_id, task_priority, due_date_offset_days,
  is_active, category, subcategory, completion_requirement_type
) VALUES (
  'Order condo docs',
  'Order condo docs',
  'Disclosures have been signed. Please order condo documents.',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Signed", "condition_field": "property_type", "condition_value": "Condo"}',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission',
  'compound:condo_ordered'
);

-- 4. Update existing disclosure document task to use auto-complete-only
UPDATE task_automations 
SET completion_requirement_type = 'auto_complete_only:disc_file'
WHERE id = 'b33fd14f-4e26-4572-9790-317e808bf201';

-- 5. Update the disclosure status trigger function to handle condition_field/condition_value for condo check
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  v_crm_user_id UUID;
  task_assignee UUID;
  condition_field_value TEXT;
  condition_matches BOOLEAN;
BEGIN
  -- Only trigger if disclosure_status actually changed
  IF NEW.disclosure_status IS DISTINCT FROM OLD.disclosure_status THEN
    -- Get CRM user ID from auth.uid()
    SELECT id INTO v_crm_user_id FROM public.users WHERE auth_user_id = auth.uid();
    
    -- Find matching automations
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE trigger_type = 'status_changed'
        AND is_active = true
        AND trigger_config->>'field' = 'disclosure_status'
        AND trigger_config->>'target_status' = NEW.disclosure_status
    LOOP
      -- Check condition_field/condition_value if present
      condition_matches := true;
      IF automation.trigger_config->>'condition_field' IS NOT NULL THEN
        -- Get the value of the condition field from the lead
        EXECUTE format('SELECT ($1).%I::TEXT', automation.trigger_config->>'condition_field')
          INTO condition_field_value
          USING NEW;
        
        -- Check if condition matches (partial match for Condo in property_type)
        IF automation.trigger_config->>'condition_value' IS NOT NULL THEN
          IF automation.trigger_config->>'condition_value' = 'Condo' THEN
            -- Special handling for Condo - partial match
            condition_matches := condition_field_value ILIKE '%Condo%';
          ELSE
            condition_matches := condition_field_value = automation.trigger_config->>'condition_value';
          END IF;
        END IF;
      END IF;
      
      -- Skip if condition doesn't match
      IF NOT condition_matches THEN
        CONTINUE;
      END IF;
      
      -- Determine assignee
      task_assignee := COALESCE(
        automation.assigned_to_user_id,
        NEW.teammate_assigned,
        v_crm_user_id
      );
      
      BEGIN
        -- Create the task
        INSERT INTO public.tasks (
          title, description, status, priority, due_date, borrower_id,
          assignee_id, created_by, completion_requirement_type, automation_id
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          'To Do',
          automation.task_priority,
          CASE 
            WHEN automation.due_date_offset_days IS NOT NULL 
            THEN CURRENT_DATE + automation.due_date_offset_days
            ELSE NULL
          END,
          NEW.id,
          task_assignee,
          v_crm_user_id,
          automation.completion_requirement_type,
          automation.id
        )
        RETURNING id INTO new_task_id;
        
        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, success, executed_at
        ) VALUES (
          automation.id, NEW.id, new_task_id, true, now()
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, success, error_message, executed_at
        ) VALUES (
          automation.id, NEW.id, NULL, false, SQLERRM, now()
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Update the loan_status trigger function to handle AWC status
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id UUID;
  v_crm_user_id UUID;
  task_assignee UUID;
BEGIN
  -- Only trigger if loan_status actually changed
  IF NEW.loan_status IS DISTINCT FROM OLD.loan_status THEN
    -- Get CRM user ID from auth.uid()
    SELECT id INTO v_crm_user_id FROM public.users WHERE auth_user_id = auth.uid();
    
    -- Find matching automations
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE trigger_type = 'status_changed'
        AND is_active = true
        AND trigger_config->>'field' = 'loan_status'
        AND trigger_config->>'target_status' = NEW.loan_status
    LOOP
      -- Determine assignee
      task_assignee := COALESCE(
        automation.assigned_to_user_id,
        NEW.teammate_assigned,
        v_crm_user_id
      );
      
      BEGIN
        -- Create the task
        INSERT INTO public.tasks (
          title, description, status, priority, due_date, borrower_id,
          assignee_id, created_by, completion_requirement_type, automation_id
        )
        VALUES (
          automation.task_name,
          automation.task_description,
          'To Do',
          automation.task_priority,
          CASE 
            WHEN automation.due_date_offset_days IS NOT NULL 
            THEN CURRENT_DATE + automation.due_date_offset_days
            ELSE NULL
          END,
          NEW.id,
          task_assignee,
          v_crm_user_id,
          automation.completion_requirement_type,
          automation.id
        )
        RETURNING id INTO new_task_id;
        
        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, success, executed_at
        ) VALUES (
          automation.id, NEW.id, new_task_id, true, now()
        );
        
      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id, lead_id, task_id, success, error_message, executed_at
        ) VALUES (
          automation.id, NEW.id, NULL, false, SQLERRM, now()
        );
      END;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;