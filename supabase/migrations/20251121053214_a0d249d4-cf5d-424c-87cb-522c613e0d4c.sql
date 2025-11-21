-- Backfill completion requirements for existing tasks based on their titles

-- Tasks that require buyer's agent call log
UPDATE tasks
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE completion_requirement_type = 'none'
  AND (
    title ILIKE '%Call Buyer%Agent%' OR
    title ILIKE '%Call BA%' OR
    title LIKE '%Call BA' OR
    title = 'File is CTC - Call BA' OR
    title ILIKE '%Appraisal Scheduled%Call%Agent%' OR
    title ILIKE '%PKG%Call%Agent%' OR
    title ILIKE '%Package%Call%Agent%'
  );

-- Tasks that require listing agent call log
UPDATE tasks
SET completion_requirement_type = 'log_call_listing_agent'
WHERE completion_requirement_type = 'none'
  AND (
    title ILIKE '%Call Listing%Agent%' OR
    title ILIKE '%Call LA%' OR
    title LIKE '%Call LA' OR
    title = 'File is CTC - Call LA' OR
    title = 'Disc Signed - Call LA' OR
    title ILIKE '%Appraisal Scheduled%Listing%'
  );

-- Tasks that require borrower call log
UPDATE tasks
SET completion_requirement_type = 'log_call_borrower'
WHERE completion_requirement_type = 'none'
  AND (
    title ILIKE '%Call Borrower%' OR
    title ILIKE '%Call Client%' OR
    title ILIKE '%Call BRWR%' OR
    title = 'File is CTC - Call BRWR' OR
    title = 'File is CTC - Call Borrower' OR
    title ILIKE '%Final%Client%Call%' OR
    title ILIKE '%Disc Sent%Call%'
  );

-- Standardize remaining task automation names
UPDATE task_automations
SET 
  task_name = 'File is CTC - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'File is CTC - Call BA';

UPDATE task_automations
SET 
  task_name = 'File is CTC - Call Listing Agent',
  completion_requirement_type = 'log_call_listing_agent'
WHERE task_name = 'File is CTC - Call LA';

-- Ensure all other call-related automations have proper completion requirements
UPDATE task_automations
SET completion_requirement_type = 'log_call_buyer_agent'
WHERE completion_requirement_type = 'none'
  AND task_name ILIKE '%Call%Buyer%Agent%';

UPDATE task_automations
SET completion_requirement_type = 'log_call_listing_agent'
WHERE completion_requirement_type = 'none'
  AND task_name ILIKE '%Call%Listing%Agent%';

UPDATE task_automations
SET completion_requirement_type = 'log_call_borrower'
WHERE completion_requirement_type = 'none'
  AND (task_name ILIKE '%Call%Borrower%' OR task_name ILIKE '%Call%Client%');