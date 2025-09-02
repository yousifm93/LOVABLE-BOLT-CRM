-- Create pricing runs table to track each pricing execution
CREATE TABLE public.pricing_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id),
  scenario_json JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing run providers table to track individual provider status
CREATE TABLE public.pricing_run_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.pricing_runs(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'skipped')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  warnings JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing offers table for normalized results from all providers
CREATE TABLE public.pricing_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.pricing_run_providers(id) ON DELETE CASCADE,
  lender TEXT NOT NULL,
  program_name TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  points NUMERIC NOT NULL DEFAULT 0,
  lock_days INTEGER NOT NULL,
  apr NUMERIC,
  payment_est NUMERIC,
  cash_to_close_delta NUMERIC,
  rank INTEGER,
  assumptions JSONB DEFAULT '[]',
  eligibility_flags JSONB DEFAULT '[]',
  normalized_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing artifacts table for screenshots and HTML snapshots
CREATE TABLE public.pricing_artifacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.pricing_run_providers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('screenshot', 'html', 'pdf', 'other')),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing credentials table for encrypted provider credentials
CREATE TABLE public.pricing_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  username TEXT NOT NULL,
  secret_ref TEXT NOT NULL, -- Reference to Supabase secret
  mfa_type TEXT CHECK (mfa_type IN ('totp', 'sms', 'none')),
  totp_secret_ref TEXT, -- Reference to TOTP secret if applicable
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.pricing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_run_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pricing_runs
CREATE POLICY "Users can manage pricing runs in their account" ON public.pricing_runs
  FOR ALL USING (
    (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = pricing_runs.lead_id AND l.account_id = get_user_account_id(auth.uid())))
    OR auth.uid() = created_by
  );

-- RLS Policies for pricing_run_providers
CREATE POLICY "Users can view pricing run providers for their runs" ON public.pricing_run_providers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pricing_runs pr 
      WHERE pr.id = pricing_run_providers.run_id 
      AND (
        (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = pr.lead_id AND l.account_id = get_user_account_id(auth.uid())))
        OR pr.created_by = auth.uid()
      )
    )
  );

-- RLS Policies for pricing_offers (no direct policy needed - inherited through provider_id)

-- RLS Policies for pricing_artifacts
CREATE POLICY "Users can view pricing artifacts for their runs" ON public.pricing_artifacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.pricing_run_providers prp
      JOIN public.pricing_runs pr ON pr.id = prp.run_id
      WHERE prp.id = pricing_artifacts.provider_id
      AND (
        (EXISTS (SELECT 1 FROM public.leads l WHERE l.id = pr.lead_id AND l.account_id = get_user_account_id(auth.uid())))
        OR pr.created_by = auth.uid()
      )
    )
  );

-- RLS Policies for pricing_credentials
CREATE POLICY "Admins can manage pricing credentials" ON public.pricing_credentials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'Admin')
  );

-- Create indexes for performance
CREATE INDEX idx_pricing_runs_lead_id ON public.pricing_runs(lead_id);
CREATE INDEX idx_pricing_runs_created_by ON public.pricing_runs(created_by);
CREATE INDEX idx_pricing_runs_status ON public.pricing_runs(status);
CREATE INDEX idx_pricing_run_providers_run_id ON public.pricing_run_providers(run_id);
CREATE INDEX idx_pricing_run_providers_status ON public.pricing_run_providers(status);
CREATE INDEX idx_pricing_offers_provider_id ON public.pricing_offers(provider_id);
CREATE INDEX idx_pricing_offers_rate ON public.pricing_offers(rate);
CREATE INDEX idx_pricing_artifacts_provider_id ON public.pricing_artifacts(provider_id);
CREATE INDEX idx_pricing_credentials_provider ON public.pricing_credentials(provider, is_active);

-- Add update triggers for timestamps
CREATE TRIGGER update_pricing_runs_updated_at
  BEFORE UPDATE ON public.pricing_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_credentials_updated_at
  BEFORE UPDATE ON public.pricing_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();