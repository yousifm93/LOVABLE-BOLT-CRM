-- Add call_type column to agent_call_logs table
ALTER TABLE public.agent_call_logs 
ADD COLUMN call_type text;

-- Add a comment describing the column
COMMENT ON COLUMN public.agent_call_logs.call_type IS 'Type of agent call: New Agent Call, Current Agent Call, Top Agent Call, Past LA Call';