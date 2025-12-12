-- Create email_automation_queue table for pending email confirmations
CREATE TABLE public.email_automation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES email_automations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  triggered_by UUID,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_automation_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view email automation queue"
ON public.email_automation_queue
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert into email automation queue"
ON public.email_automation_queue
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update email automation queue"
ON public.email_automation_queue
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete from email automation queue"
ON public.email_automation_queue
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Create index for faster queries
CREATE INDEX idx_email_automation_queue_status ON public.email_automation_queue(status);
CREATE INDEX idx_email_automation_queue_lead_id ON public.email_automation_queue(lead_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_automation_queue;