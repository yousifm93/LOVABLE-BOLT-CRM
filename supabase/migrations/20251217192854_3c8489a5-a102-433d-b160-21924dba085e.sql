-- Create daily_market_updates table for storing rates and AI summaries
CREATE TABLE public.daily_market_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Rates from Axiom pricing run
  rate_30yr_fixed DECIMAL(5,3),
  rate_15yr_fixed DECIMAL(5,3),
  rate_30yr_fha DECIMAL(5,3),
  rate_bank_statement DECIMAL(5,3),
  rate_dscr DECIMAL(5,3),
  
  -- Daily changes from previous day
  change_30yr_fixed DECIMAL(5,3),
  change_15yr_fixed DECIMAL(5,3),
  change_30yr_fha DECIMAL(5,3),
  
  -- AI-generated market summary
  ai_market_summary TEXT,
  
  -- Pricing run reference
  pricing_run_id UUID REFERENCES public.pricing_runs(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.daily_market_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (all authenticated users can read)
CREATE POLICY "Users can view market updates"
ON public.daily_market_updates
FOR SELECT
USING (true);

-- Create policy for insert/update (any authenticated user can manage)
CREATE POLICY "Users can insert market updates"
ON public.daily_market_updates
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update market updates"
ON public.daily_market_updates
FOR UPDATE
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_daily_market_updates_updated_at
BEFORE UPDATE ON public.daily_market_updates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for date lookups
CREATE INDEX idx_daily_market_updates_date ON public.daily_market_updates(date DESC);