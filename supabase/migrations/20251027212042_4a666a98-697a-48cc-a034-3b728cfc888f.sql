-- Add email tracking columns to email_logs table
ALTER TABLE email_logs 
ADD COLUMN IF NOT EXISTS provider_message_id text,
ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS opened_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS clicked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS bounced_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS error_details text;

-- Create index for faster webhook lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_provider_message_id ON email_logs(provider_message_id);