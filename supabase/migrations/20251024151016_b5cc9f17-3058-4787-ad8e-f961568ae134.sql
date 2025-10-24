-- Migrate existing data from old values to new values
UPDATE leads SET loan_status = 'New' WHERE loan_status IN ('NEW', 'New RFP');
UPDATE leads SET loan_status = 'SUB' WHERE loan_status = 'SUV';

-- Set any NULL loan_status in Active board to "New"
UPDATE leads 
SET loan_status = 'New' 
WHERE pipeline_stage_id = '76eb2e82-e1d9-4f2d-a57d-2120a25696db' 
  AND loan_status IS NULL;