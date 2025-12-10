-- Create status_change_logs table for tracking loan status changes
CREATE TABLE public.status_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.status_change_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for team members
CREATE POLICY "Team members can view status changes"
ON public.status_change_logs
FOR SELECT
USING (public.is_team_member(auth.uid()));

CREATE POLICY "Team members can insert status changes"
ON public.status_change_logs
FOR INSERT
WITH CHECK (public.is_team_member(auth.uid()));

-- Create trigger function to log loan_status changes
CREATE OR REPLACE FUNCTION public.log_loan_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid;
BEGIN
  -- Only log if loan_status actually changed
  IF OLD.loan_status IS DISTINCT FROM NEW.loan_status THEN
    BEGIN
      v_user := (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN 
      v_user := NULL;
    END;
    
    INSERT INTO status_change_logs (lead_id, field_name, old_value, new_value, changed_by)
    VALUES (NEW.id, 'loan_status', OLD.loan_status::text, NEW.loan_status::text, v_user);
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on leads table
CREATE TRIGGER log_loan_status_change_trigger
AFTER UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.log_loan_status_change();

-- Delete tasks created before December 1st, 2025
DELETE FROM public.tasks WHERE created_at < '2025-12-01';