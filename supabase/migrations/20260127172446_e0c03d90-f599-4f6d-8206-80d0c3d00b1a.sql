-- Fix Rakesh's lead account_id to match the team
UPDATE leads 
SET account_id = '47e707c5-62d0-4ee9-99a3-76572c73a8e1' 
WHERE id = '2e66a1f4-5378-43b8-80e2-cdf591299626';

-- Add attachment_url columns to notes, call_logs, and sms_logs for activity attachments
ALTER TABLE notes ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE sms_logs ADD COLUMN IF NOT EXISTS attachment_url TEXT;