-- Add last_follow_up_date field to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS last_follow_up_date date;

-- Add comment
COMMENT ON COLUMN public.leads.last_follow_up_date IS 'Date of the last follow-up with this lead';