-- Create email_automation_executions table for tracking email automation history
CREATE TABLE public.email_automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid REFERENCES public.email_automations(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  recipient_type text NOT NULL,
  cc_email text,
  executed_at timestamptz DEFAULT now(),
  success boolean DEFAULT true,
  error_message text,
  template_name text,
  subject_sent text,
  is_test_mode boolean DEFAULT false,
  message_id text
);

-- Enable RLS
ALTER TABLE public.email_automation_executions ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can view email automation executions"
  ON public.email_automation_executions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert email automation executions"
  ON public.email_automation_executions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_email_automation_executions_automation_id ON public.email_automation_executions(automation_id);
CREATE INDEX idx_email_automation_executions_executed_at ON public.email_automation_executions(executed_at DESC);

-- Add last_run_at column to email_automations if not exists
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
ALTER TABLE public.email_automations ADD COLUMN IF NOT EXISTS execution_count integer DEFAULT 0;