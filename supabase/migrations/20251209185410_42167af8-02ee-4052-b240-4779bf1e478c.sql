-- Add columns to email_logs for inbound email support
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS html_body TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES buyer_agents(id);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS attachments_json JSONB DEFAULT '[]';

-- Create index for faster agent email lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_agent_id ON email_logs(agent_id);

-- Add comment for clarity
COMMENT ON COLUMN email_logs.body IS 'Plain text email body for inbound emails';
COMMENT ON COLUMN email_logs.html_body IS 'HTML email body for inbound emails';
COMMENT ON COLUMN email_logs.agent_id IS 'Reference to buyer_agent if sender is a real estate agent';
COMMENT ON COLUMN email_logs.attachments_json IS 'JSON array of attachment info for inbound emails';