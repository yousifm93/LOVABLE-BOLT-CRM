-- Add last_attempted_call column to buyer_agents table
ALTER TABLE buyer_agents
ADD COLUMN last_attempted_call TIMESTAMP WITH TIME ZONE;