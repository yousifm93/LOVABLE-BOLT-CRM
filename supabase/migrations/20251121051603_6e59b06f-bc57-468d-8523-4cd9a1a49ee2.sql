-- Phase 1.1: Add completion requirement fields to task_automations
ALTER TABLE public.task_automations
ADD COLUMN completion_requirement_type text DEFAULT 'none',
ADD COLUMN completion_requirement_config jsonb DEFAULT '{}'::jsonb;

-- Add check constraint for valid completion requirement types
ALTER TABLE public.task_automations
ADD CONSTRAINT task_automations_completion_requirement_type_check 
CHECK (completion_requirement_type IN (
  'none',
  'log_call_buyer_agent',
  'log_call_listing_agent', 
  'log_call_borrower',
  'status_change'
));

-- Phase 1.2 & 1.3: Standardize task names and set completion requirements
-- Lead Status Automations
UPDATE public.task_automations
SET 
  task_name = 'New pre-approved borrower - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'New pre-approved borrower - Call buyer''s agent';

UPDATE public.task_automations
SET 
  task_name = 'New pre-qualified client - Call Borrower',
  completion_requirement_type = 'log_call_borrower'
WHERE task_name = 'New pre-qualified client - Call client';

UPDATE public.task_automations
SET 
  task_name = 'New pre-approved borrower - Call Borrower',
  completion_requirement_type = 'log_call_borrower'
WHERE task_name = 'New pre-approved borrower - Call borrower';

UPDATE public.task_automations
SET 
  task_name = 'New pre-qualified client - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'New pre-qualified client - Call buyer''s agent';

-- Active Loan Automations - Replace abbreviations and set requirements
UPDATE public.task_automations
SET 
  task_name = 'Past client call',
  completion_requirement_type = 'log_call_borrower'
WHERE task_name LIKE '%Past client call%';

UPDATE public.task_automations
SET 
  task_name = 'Appraisal Scheduled - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'Appraisal Scheduled- Call BA';

UPDATE public.task_automations
SET 
  task_name = 'Package Final - Final Borrower Call',
  completion_requirement_type = 'log_call_borrower'
WHERE task_name = 'Package Final- Final Client Call';

UPDATE public.task_automations
SET 
  task_name = 'Package Finalized - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'PKG Finalized- Call BA';

UPDATE public.task_automations
SET 
  task_name = 'Disclosure Signed - Call Listing Agent',
  completion_requirement_type = 'log_call_listing_agent'
WHERE task_name = 'Disc Signed - Call LA';

UPDATE public.task_automations
SET 
  task_name = 'File is CTC - Call Borrower',
  completion_requirement_type = 'log_call_borrower'
WHERE task_name = 'File is CTC - Call BRWR';

UPDATE public.task_automations
SET 
  task_name = 'File is CTC - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'File CTC- Call BA';

UPDATE public.task_automations
SET 
  task_name = 'File is CTC - Call Listing Agent',
  completion_requirement_type = 'log_call_listing_agent'
WHERE task_name = 'File CTC- Call LA';

UPDATE public.task_automations
SET 
  task_name = 'Disclosure Sent - Call Borrower',
  completion_requirement_type = 'log_call_borrower'
WHERE task_name = 'Disc Sent - Call BRWR';

UPDATE public.task_automations
SET 
  task_name = 'Appraisal Received - Call Buyer''s Agent',
  completion_requirement_type = 'log_call_buyer_agent'
WHERE task_name = 'Appraisal Received - Call Buyer''s Agent';

UPDATE public.task_automations
SET 
  task_name = 'Appraisal Scheduled - Call Listing Agent',
  completion_requirement_type = 'log_call_listing_agent'
WHERE task_name = 'Appraisal Scheduled - Call Listing Agent';

-- Phase 2.1: Add completion_requirement_type to tasks table
ALTER TABLE public.tasks
ADD COLUMN completion_requirement_type text DEFAULT 'none';