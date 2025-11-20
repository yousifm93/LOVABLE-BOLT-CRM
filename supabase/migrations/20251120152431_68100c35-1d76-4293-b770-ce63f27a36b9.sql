-- Add follow_up_count field to leads table
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS follow_up_count integer DEFAULT 0;

-- Add comment
COMMENT ON COLUMN public.leads.follow_up_count IS 'Number of follow-ups conducted for this lead';

-- Create a trigger to auto-increment when last_follow_up_date changes
CREATE OR REPLACE FUNCTION increment_follow_up_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if last_follow_up_date actually changed to a new non-null value
  IF NEW.last_follow_up_date IS NOT NULL AND 
     (OLD.last_follow_up_date IS NULL OR NEW.last_follow_up_date != OLD.last_follow_up_date) THEN
    NEW.follow_up_count = COALESCE(OLD.follow_up_count, 0) + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_follow_up_count
  BEFORE UPDATE OF last_follow_up_date ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION increment_follow_up_count();