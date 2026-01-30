-- Fix auto-complete follow-up trigger (remove non-existent completed_at column)
-- The previous migration referenced completed_at which doesn't exist in tasks table

CREATE OR REPLACE FUNCTION public.auto_complete_followup_on_screening()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When moving TO Screening stage (a4e162e0-5421-4d17-8ad5-4b1195bbc995)
  IF NEW.pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995'::uuid 
     AND OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    
    UPDATE tasks 
    SET status = 'Done',
        updated_at = NOW()
    WHERE borrower_id = NEW.id
      AND status != 'Done'
      AND deleted_at IS NULL
      AND (
        LOWER(title) LIKE '%follow up on pending app%'
        OR LOWER(title) LIKE '%follow up on new lead%'
        OR LOWER(title) LIKE '%pending app follow%'
        OR LOWER(title) LIKE '%lead follow%'
      );
  END IF;
  RETURN NEW;
END;
$$;