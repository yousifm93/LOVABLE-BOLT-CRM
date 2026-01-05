-- Add idle tracking fields to leads table
ALTER TABLE public.leads
ADD COLUMN idle_reason text,
ADD COLUMN idle_future_steps boolean,
ADD COLUMN idle_followup_date timestamptz;