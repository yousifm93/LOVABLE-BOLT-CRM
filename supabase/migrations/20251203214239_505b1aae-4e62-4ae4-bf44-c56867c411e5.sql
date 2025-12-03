-- Create email_automations table
CREATE TABLE public.email_automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'pipeline_stage_changed', 'status_changed', 'date_based'
  trigger_config JSONB DEFAULT '{}'::jsonb,
  pipeline_group TEXT NOT NULL, -- 'active', 'past_client', 'leads'
  recipient_type TEXT NOT NULL, -- 'borrower', 'buyer_agent', 'listing_agent', 'lender', 'team_member'
  purpose TEXT,
  template_id UUID REFERENCES public.email_templates(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view email automations"
  ON public.email_automations FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage email automations"
  ON public.email_automations FOR ALL
  USING (EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'Admin'::user_role
  ));

-- Create updated_at trigger
CREATE TRIGGER update_email_automations_updated_at
  BEFORE UPDATE ON public.email_automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();