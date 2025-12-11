-- Add last_morning_review_at field to leads table for tracking daily review completion
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_morning_review_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient filtering on review view
CREATE INDEX IF NOT EXISTS idx_leads_last_morning_review_at ON public.leads(last_morning_review_at);

-- Create email_response_suggestions table to track emails that need responses
CREATE TABLE IF NOT EXISTS public.email_response_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_log_id UUID NOT NULL REFERENCES public.email_logs(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  needs_response BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
  confidence NUMERIC(3,2),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID
);

-- Enable RLS
ALTER TABLE public.email_response_suggestions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for authenticated users
CREATE POLICY "Users can view email response suggestions" 
ON public.email_response_suggestions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert email response suggestions" 
ON public.email_response_suggestions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update email response suggestions" 
ON public.email_response_suggestions 
FOR UPDATE 
USING (true);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_response_suggestions_email_log_id ON public.email_response_suggestions(email_log_id);
CREATE INDEX IF NOT EXISTS idx_email_response_suggestions_status ON public.email_response_suggestions(status);