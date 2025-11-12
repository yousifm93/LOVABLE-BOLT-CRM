-- Create agent_call_logs table for structured call logging
CREATE TABLE IF NOT EXISTS agent_call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES buyer_agents(id) ON DELETE CASCADE,
  logged_by UUID NOT NULL REFERENCES users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  summary TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_agent_call_logs_agent_id ON agent_call_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_call_logs_logged_at ON agent_call_logs(logged_at DESC);

-- Enable RLS
ALTER TABLE agent_call_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all agent call logs"
  ON agent_call_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create agent call logs"
  ON agent_call_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND logged_by = auth.uid());

CREATE POLICY "Users can update their own agent call logs"
  ON agent_call_logs FOR UPDATE
  USING (auth.uid() IS NOT NULL AND logged_by = auth.uid());