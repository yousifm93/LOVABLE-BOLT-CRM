-- Add notes field to buyer_agents table for Activity Tracking
ALTER TABLE buyer_agents ADD COLUMN IF NOT EXISTS notes TEXT;