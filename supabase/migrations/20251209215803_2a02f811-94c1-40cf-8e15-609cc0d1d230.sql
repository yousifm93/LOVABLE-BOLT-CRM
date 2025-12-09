-- Add ai_summary column to email_logs table for storing AI-generated email summaries
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS ai_summary TEXT;