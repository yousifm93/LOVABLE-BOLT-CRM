-- Create function to execute disclosure status changed automations
CREATE OR REPLACE FUNCTION public.execute_disclosure_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if disclosure_status actually changed
  IF OLD.disclosure_status IS DISTINCT FROM NEW.disclosure_status THEN
    -- Loop through all active automations for disclosure_status changes
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE trigger_type = 'status_changed'
        AND is_active = true
        AND trigger_config->>'field' = 'disclosure_status'
        AND trigger_config->>'target_status' = NEW.disclosure_status::text
    LOOP
      BEGIN
        -- Create the task
        INSERT INTO public.tasks (
          title,
          description,
          lead_id,
          assigned_to,
          priority,
          due_date,
          status,
          created_by
        ) VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          'Working on it',
          automation.assigned_to_user_id
        ) RETURNING id INTO new_task_id;

        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          true,
          NOW()
        );

      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          error_message,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          NULL,
          false,
          SQLERRM,
          NOW()
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to execute loan status changed automations
CREATE OR REPLACE FUNCTION public.execute_loan_status_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    -- Loop through all active automations for loan_status changes
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE trigger_type = 'status_changed'
        AND is_active = true
        AND trigger_config->>'field' = 'loan_status'
        AND trigger_config->>'target_status' = NEW.loan_status::text
    LOOP
      BEGIN
        -- Create the task
        INSERT INTO public.tasks (
          title,
          description,
          lead_id,
          assigned_to,
          priority,
          due_date,
          status,
          created_by
        ) VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          'Working on it',
          automation.assigned_to_user_id
        ) RETURNING id INTO new_task_id;

        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          true,
          NOW()
        );

      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          error_message,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          NULL,
          false,
          SQLERRM,
          NOW()
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to execute close date changed automations (conditional on disclosure_status = 'Signed')
CREATE OR REPLACE FUNCTION public.execute_close_date_changed_automations()
RETURNS TRIGGER AS $$
DECLARE
  automation RECORD;
  new_task_id uuid;
BEGIN
  -- Only proceed if close_date actually changed AND disclosure_status is 'Signed'
  IF OLD.close_date IS DISTINCT FROM NEW.close_date AND NEW.disclosure_status = 'Signed' THEN
    -- Loop through all active automations for close_date changes
    FOR automation IN
      SELECT * FROM public.task_automations
      WHERE trigger_type = 'status_changed'
        AND is_active = true
        AND trigger_config->>'field' = 'close_date'
    LOOP
      BEGIN
        -- Create the task
        INSERT INTO public.tasks (
          title,
          description,
          lead_id,
          assigned_to,
          priority,
          due_date,
          status,
          created_by
        ) VALUES (
          automation.task_name,
          automation.task_description,
          NEW.id,
          automation.assigned_to_user_id,
          automation.task_priority::task_priority,
          CURRENT_DATE + COALESCE(automation.due_date_offset_days, 0),
          'Working on it',
          automation.assigned_to_user_id
        ) RETURNING id INTO new_task_id;

        -- Log successful execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          new_task_id,
          true,
          NOW()
        );

      EXCEPTION WHEN OTHERS THEN
        -- Log failed execution
        INSERT INTO public.task_automation_executions (
          automation_id,
          lead_id,
          task_id,
          success,
          error_message,
          executed_at
        ) VALUES (
          automation.id,
          NEW.id,
          NULL,
          false,
          SQLERRM,
          NOW()
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
CREATE TRIGGER trigger_disclosure_status_changed_automations
  AFTER UPDATE OF disclosure_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_disclosure_status_changed_automations();

CREATE TRIGGER trigger_loan_status_changed_automations
  AFTER UPDATE OF loan_status ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_loan_status_changed_automations();

CREATE TRIGGER trigger_close_date_changed_automations
  AFTER UPDATE OF close_date ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.execute_close_date_changed_automations();

-- Seed 10 new task automations (assigned to Yousif Mohamed)
INSERT INTO public.task_automations (name, trigger_type, trigger_config, task_name, task_description, assigned_to_user_id, task_priority, due_date_offset_days, is_active) VALUES
-- 1. Close Date Changes (conditional on disclosure_status = 'Signed')
('Closing Date Changed - Update All Parties/Systems', 'status_changed', '{"field": "close_date"}'::jsonb, 'Closing Date Changed - Update All Parties/Systems', 'Update all parties and systems about the closing date change', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 2. Disclosure Status → "Sent"
('Disc Sent - Call BRWR', 'status_changed', '{"field": "disclosure_status", "target_status": "Sent"}'::jsonb, 'Disc Sent - Call BRWR', 'Call borrower after disclosures are sent', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 3. Disclosure Status → "Signed" (first)
('Disc Signed - Call LA', 'status_changed', '{"field": "disclosure_status", "target_status": "Signed"}'::jsonb, 'Disc Signed - Call LA', 'Call listing agent after disclosures are signed', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 4. Disclosure Status → "Signed" (second)
('Order Appraisal', 'status_changed', '{"field": "disclosure_status", "target_status": "Signed"}'::jsonb, 'Order Appraisal', 'Order appraisal after disclosures are signed', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 5. Loan Status → "AWC"
('Add Approval Conditions', 'status_changed', '{"field": "loan_status", "target_status": "AWC"}'::jsonb, 'Add Approval Conditions', 'Add approval conditions when loan status is AWC', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 6. Loan Status → "CTC" (first)
('File is CTC - Call BRWR', 'status_changed', '{"field": "loan_status", "target_status": "CTC"}'::jsonb, 'File is CTC - Call BRWR', 'Call borrower when file is clear to close', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 7. Loan Status → "CTC" (second)
('File is CTC - Call BA', 'status_changed', '{"field": "loan_status", "target_status": "CTC"}'::jsonb, 'File is CTC - Call BA', 'Call buyer''s agent when file is clear to close', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 8. Loan Status → "CTC" (third)
('File is CTC - Call LA', 'status_changed', '{"field": "loan_status", "target_status": "CTC"}'::jsonb, 'File is CTC - Call LA', 'Call listing agent when file is clear to close', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 9. Loan Status → "New"
('On-Board New Client', 'status_changed', '{"field": "loan_status", "target_status": "New"}'::jsonb, 'On-Board New Client', 'Onboard new client when loan status is new', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true),

-- 10. Loan Status → "RFP"
('Submit File', 'status_changed', '{"field": "loan_status", "target_status": "RFP"}'::jsonb, 'Submit File', 'Submit file when ready for processor', '08e73d69-4707-4773-84a4-69ce2acd6a11', 'Medium', 0, true);