-- Create valuation_requests table
CREATE TABLE public.valuation_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  mode TEXT NOT NULL CHECK (mode IN ('internal', 'public')),
  address TEXT NOT NULL,
  unit TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  beds INTEGER,
  baths NUMERIC,
  sqft INTEGER,
  requester_type TEXT NOT NULL CHECK (requester_type IN ('internal', 'public')),
  lead_id UUID,
  provider_primary TEXT,
  provider_used TEXT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  error_message TEXT
);

-- Create property_valuations table
CREATE TABLE public.property_valuations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.valuation_requests(id),
  estimate NUMERIC,
  low NUMERIC,
  high NUMERIC,
  confidence NUMERIC,
  provider_payload JSONB,
  cached_until TIMESTAMP WITH TIME ZONE
);

-- Create valuation_comparables table
CREATE TABLE public.valuation_comparables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  valuation_id UUID NOT NULL REFERENCES public.property_valuations(id),
  address TEXT NOT NULL,
  distance_miles NUMERIC,
  beds INTEGER,
  baths NUMERIC,
  sqft INTEGER,
  lot_sqft INTEGER,
  year_built INTEGER,
  sale_price NUMERIC,
  sale_date DATE,
  photo_url TEXT
);

-- Enable RLS
ALTER TABLE public.valuation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_valuations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valuation_comparables ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage valuation requests"
ON public.valuation_requests
FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage property valuations"
ON public.property_valuations
FOR ALL
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage valuation comparables"
ON public.valuation_comparables
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Create indexes for performance
CREATE INDEX idx_valuation_requests_address ON public.valuation_requests(address);
CREATE INDEX idx_valuation_requests_zip ON public.valuation_requests(zip);
CREATE INDEX idx_property_valuations_cached_until ON public.property_valuations(cached_until);
CREATE INDEX idx_valuation_comparables_valuation_id ON public.valuation_comparables(valuation_id);