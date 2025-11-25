-- Add subcategory column to task_automations
ALTER TABLE task_automations 
ADD COLUMN subcategory TEXT;

-- Update category constraint to include 'past_client'
ALTER TABLE task_automations DROP CONSTRAINT IF EXISTS task_automations_category_check;
ALTER TABLE task_automations ADD CONSTRAINT task_automations_category_check 
  CHECK (category IN ('marketing', 'lead_status', 'active_loan', 'past_client'));

-- Add subcategory constraint
ALTER TABLE task_automations ADD CONSTRAINT task_automations_subcategory_check 
  CHECK (subcategory IS NULL OR subcategory IN ('appraisal', 'closing', 'submission'));

-- Move 'Past client call' to past_client category
UPDATE task_automations 
SET category = 'past_client', subcategory = NULL 
WHERE name = 'Past client call';

-- Assign Appraisal subcategory
UPDATE task_automations SET subcategory = 'appraisal' 
WHERE name IN (
  'Appraisal Received - Call Buyer''s Agent',
  'Appraisal Scheduled - Call Listing Agent',
  'Appraisal Scheduled- Call BA',
  'Order Appraisal'
);

-- Assign Closing subcategory (CTC + Package)
UPDATE task_automations SET subcategory = 'closing' 
WHERE name IN (
  'File is CTC - Call BA',
  'File is CTC - Call BRWR',
  'File is CTC - Call LA',
  'Package Final- Final Client Call',
  'PKG Finalized- Call BA'
);

-- Assign Submission subcategory
UPDATE task_automations SET subcategory = 'submission' 
WHERE name IN (
  'Submit File',
  'On-Board New Client',
  'Disc Signed - Call LA',
  'New active file - Onboard and disclose'
);