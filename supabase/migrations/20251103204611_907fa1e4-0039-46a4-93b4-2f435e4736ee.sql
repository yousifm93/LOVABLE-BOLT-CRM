-- Create stage_history table to track all stage transitions
CREATE TABLE IF NOT EXISTS public.stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.pipeline_stages(id),
  to_stage_id UUID REFERENCES public.pipeline_stages(id),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Add indexes for performance
CREATE INDEX idx_stage_history_lead_id ON public.stage_history(lead_id);
CREATE INDEX idx_stage_history_changed_at ON public.stage_history(changed_at DESC);

-- Enable RLS
ALTER TABLE public.stage_history ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view stage history for leads in their account
CREATE POLICY "Users can view stage history for their account's leads"
  ON public.stage_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leads l
      WHERE l.id = stage_history.lead_id
      AND l.account_id = get_user_account_id(auth.uid())
    )
  );

-- Create function to log stage changes
CREATE OR REPLACE FUNCTION log_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if pipeline_stage_id actually changed
  IF OLD.pipeline_stage_id IS DISTINCT FROM NEW.pipeline_stage_id THEN
    INSERT INTO public.stage_history (
      lead_id,
      from_stage_id,
      to_stage_id,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.pipeline_stage_id,
      NEW.pipeline_stage_id,
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically log stage changes
DROP TRIGGER IF EXISTS log_stage_change_trigger ON public.leads;
CREATE TRIGGER log_stage_change_trigger
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION log_stage_change();

-- Clean up redundant trigger (keeping only stamp_stage_timestamps)
DROP TRIGGER IF EXISTS stage_timestamp_trigger ON public.leads;
DROP FUNCTION IF EXISTS update_stage_timestamp();