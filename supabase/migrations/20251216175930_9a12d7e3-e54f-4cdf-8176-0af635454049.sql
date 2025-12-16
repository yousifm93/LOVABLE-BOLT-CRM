-- Fix Cullen Mahoney lead account_id for RLS to pass
UPDATE leads 
SET account_id = '47e707c5-62d0-4ee9-99a3-76572c73a8e1'
WHERE id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88';

-- Add aus_approval_file column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS aus_approval_file text;

COMMENT ON COLUMN leads.aus_approval_file IS 'Path to AUS (Automated Underwriting System) approval document';