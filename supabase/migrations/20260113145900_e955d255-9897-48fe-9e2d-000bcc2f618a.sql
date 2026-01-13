-- Create condo_searches table for MLS condo sales search
CREATE TABLE public.condo_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  street_num TEXT NOT NULL,
  direction TEXT DEFAULT '',
  street_name TEXT NOT NULL,
  street_type TEXT DEFAULT '',
  city TEXT,
  state TEXT DEFAULT 'FL',
  zip TEXT,
  results_json JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.condo_searches ENABLE ROW LEVEL SECURITY;

-- Users can view their own searches
CREATE POLICY "Users can view own condo searches"
ON public.condo_searches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create searches
CREATE POLICY "Users can create condo searches"
ON public.condo_searches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own searches (for status updates from edge function)
CREATE POLICY "Users can update own condo searches"
ON public.condo_searches
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_condo_searches_user_id ON public.condo_searches(user_id);
CREATE INDEX idx_condo_searches_status ON public.condo_searches(status);
CREATE INDEX idx_condo_searches_created_at ON public.condo_searches(created_at DESC);

-- Enable realtime for live status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.condo_searches;