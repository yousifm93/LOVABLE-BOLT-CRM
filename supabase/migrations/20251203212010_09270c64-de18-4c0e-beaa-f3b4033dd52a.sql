-- First drop the existing check constraint on completion_requirement_type
ALTER TABLE task_automations DROP CONSTRAINT IF EXISTS task_automations_completion_requirement_type_check;

-- Also drop on tasks table if exists
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_completion_requirement_type_check;

-- Now update task_automations with correct completion requirements

-- LEAD STATUS AUTOMATIONS
UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name = 'New Pre-Approved Borrower Call' 
  AND category = 'lead_status';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name ILIKE '%Pre-Approved%Buyer%Agent%' 
  AND category = 'lead_status';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%Pre-Qualified%Borrower%' 
  AND category = 'lead_status';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name ILIKE '%Pre-Qualified%Buyer%Agent%' 
  AND category = 'lead_status';

-- ACTIVE LOAN - APPRAISAL
UPDATE task_automations 
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name ILIKE '%Appraisal Scheduled%Buyer%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name ILIKE '%Appraisal Received%Buyer%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_listing_agent'
WHERE task_name ILIKE '%Appraisal Scheduled%Listing%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'field_populated:appr_date_time'
WHERE task_name ILIKE '%Follow%Appraisal%Scheduling%' 
  AND category = 'active_loan';

-- ACTIVE LOAN - CLOSING
UPDATE task_automations 
SET completion_requirement_type = 'field_value:package_status=Final'
WHERE task_name ILIKE '%Finalize Closing Package%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'field_value:title_status=Received'
WHERE task_name ILIKE '%Follow%Title%Work%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE (task_name ILIKE '%Package%Final%Borrower%Call%' 
  OR task_name ILIKE '%PKG Finalized%Borrower%')
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name ILIKE '%Package%Final%Buyer%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_listing_agent'
WHERE task_name ILIKE '%CTC%Listing%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name ILIKE '%CTC%Buyer%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%CTC%Borrower%' 
  AND category = 'active_loan';

-- ACTIVE LOAN - SUBMISSION
UPDATE task_automations 
SET completion_requirement_type = 'field_value:loan_status=AWC'
WHERE task_name ILIKE '%Follow%Initial%Approval%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'field_value:disclosure_status=Ordered,Sent,Signed'
WHERE task_name ILIKE '%Onboard%Disclose%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_listing_agent'
WHERE task_name ILIKE '%Disclosure%Signed%Listing%Agent%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%Disclosure%Sent%Borrower%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'field_value:loan_status=SUB'
WHERE task_name ILIKE '%Submit File%' 
  AND category = 'active_loan';

-- ACTIVE LOAN - OTHER
UPDATE task_automations 
SET completion_requirement_type = 'field_populated:lock_expiration_date'
WHERE task_name ILIKE '%Rate Lock%' 
  AND category = 'active_loan';

UPDATE task_automations 
SET completion_requirement_type = 'field_value:epo_status=Sent'
WHERE task_name ILIKE '%Send EPO%Borrower%' 
  AND category = 'active_loan';

-- PAST CLIENT AUTOMATIONS
UPDATE task_automations 
SET completion_requirement_type = 'log_note_borrower'
WHERE (task_name ILIKE '%Past Client%Needs Support%' 
  OR (task_name ILIKE '%Needs Support%' AND category = 'past_client'));

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%90%Day%Post%Close%' 
  AND category = 'past_client';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%21%Day%Post%Close%' 
  AND category = 'past_client';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%Day After Closing%' 
  AND category = 'past_client';

UPDATE task_automations 
SET completion_requirement_type = 'log_call_borrower'
WHERE task_name ILIKE '%Past Client Call%' 
  AND category = 'past_client';

-- Create function to auto-complete tasks when lead fields change
CREATE OR REPLACE FUNCTION public.auto_complete_tasks_on_lead_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  task_record RECORD;
  field_name text;
  field_value text;
  allowed_values text[];
  req_type text;
  thirty_days_ago timestamp;
BEGIN
  thirty_days_ago := NOW() - INTERVAL '30 days';
  
  FOR task_record IN
    SELECT id, title, completion_requirement_type
    FROM tasks
    WHERE borrower_id = NEW.id
      AND status != 'Done'
      AND deleted_at IS NULL
      AND created_at >= thirty_days_ago
      AND (completion_requirement_type LIKE 'field_populated:%' 
           OR completion_requirement_type LIKE 'field_value:%')
  LOOP
    req_type := task_record.completion_requirement_type;
    
    IF req_type LIKE 'field_populated:%' THEN
      field_name := split_part(req_type, ':', 2);
      EXECUTE format('SELECT ($1).%I::text', field_name) INTO field_value USING NEW;
      IF field_value IS NOT NULL AND field_value != '' THEN
        UPDATE tasks SET status = 'Done' WHERE id = task_record.id;
      END IF;
    END IF;
    
    IF req_type LIKE 'field_value:%' THEN
      field_name := split_part(split_part(req_type, ':', 2), '=', 1);
      allowed_values := string_to_array(split_part(split_part(req_type, ':', 2), '=', 2), ',');
      EXECUTE format('SELECT ($1).%I::text', field_name) INTO field_value USING NEW;
      IF field_value = ANY(allowed_values) THEN
        UPDATE tasks SET status = 'Done' WHERE id = task_record.id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_auto_complete_tasks_on_lead_update ON leads;
CREATE TRIGGER trigger_auto_complete_tasks_on_lead_update
AFTER UPDATE ON leads
FOR EACH ROW
EXECUTE FUNCTION auto_complete_tasks_on_lead_update();