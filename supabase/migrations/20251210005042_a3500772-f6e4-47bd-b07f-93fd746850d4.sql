-- Create email_field_suggestions table to store AI-generated field update suggestions
CREATE TABLE public.email_field_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id UUID NOT NULL REFERENCES public.email_logs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_display_name TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.80,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_field_suggestions_lead_id ON public.email_field_suggestions(lead_id);
CREATE INDEX idx_email_field_suggestions_status ON public.email_field_suggestions(status);
CREATE INDEX idx_email_field_suggestions_email_log_id ON public.email_field_suggestions(email_log_id);

-- Enable RLS
ALTER TABLE public.email_field_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view email field suggestions"
  ON public.email_field_suggestions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert email field suggestions"
  ON public.email_field_suggestions
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update email field suggestions"
  ON public.email_field_suggestions
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Add comment
COMMENT ON TABLE public.email_field_suggestions IS 'Stores AI-generated suggestions for CRM field updates based on email content analysis';