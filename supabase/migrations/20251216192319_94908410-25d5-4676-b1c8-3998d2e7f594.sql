-- Create lender_field_suggestions table for tracking AI-suggested updates to lenders from marketing emails
CREATE TABLE public.lender_field_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id UUID REFERENCES public.email_logs(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES public.lenders(id) ON DELETE CASCADE,
  is_new_lender BOOLEAN DEFAULT false,
  suggested_lender_name TEXT,
  field_name TEXT NOT NULL,
  current_value TEXT,
  suggested_value TEXT NOT NULL,
  confidence NUMERIC(3,2) DEFAULT 0.80,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.lender_field_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view lender field suggestions"
ON public.lender_field_suggestions
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert lender field suggestions"
ON public.lender_field_suggestions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update lender field suggestions"
ON public.lender_field_suggestions
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- Create index for efficient queries
CREATE INDEX idx_lender_field_suggestions_email_log_id ON public.lender_field_suggestions(email_log_id);
CREATE INDEX idx_lender_field_suggestions_lender_id ON public.lender_field_suggestions(lender_id);
CREATE INDEX idx_lender_field_suggestions_status ON public.lender_field_suggestions(status);