-- Add agent tracking fields to buyer_agents table
ALTER TABLE buyer_agents 
ADD COLUMN IF NOT EXISTS last_agent_call TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_agent_call TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS agent_rank TEXT CHECK (agent_rank IN ('A', 'B', 'C', 'D', 'F'));

COMMENT ON COLUMN buyer_agents.last_agent_call IS 'Timestamp of last call with this agent';
COMMENT ON COLUMN buyer_agents.next_agent_call IS 'Scheduled timestamp for next call with this agent';
COMMENT ON COLUMN buyer_agents.agent_rank IS 'Agent performance ranking: A (Excellent), B (Good), C (Average), D (Below Average), F (Poor)';