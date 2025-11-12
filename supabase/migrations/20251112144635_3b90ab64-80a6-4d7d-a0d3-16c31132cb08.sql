-- Extend agent_call_logs table to support both calls and meetings
ALTER TABLE agent_call_logs 
  ADD COLUMN IF NOT EXISTS log_type TEXT DEFAULT 'call' CHECK (log_type IN ('call', 'meeting')),
  ADD COLUMN IF NOT EXISTS meeting_location TEXT;

-- Update existing records to have log_type set
UPDATE agent_call_logs SET log_type = 'call' WHERE log_type IS NULL;

-- Add comment for clarity
COMMENT ON COLUMN agent_call_logs.log_type IS 'Type of activity logged: call or meeting';
COMMENT ON COLUMN agent_call_logs.meeting_location IS 'Location of the meeting (if applicable)';