-- Set default account_id and created_by on leads inserts via trigger
CREATE OR REPLACE FUNCTION public.set_lead_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set created_by from current auth user if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  -- Set account_id using helper or profiles fallback if not provided
  IF NEW.account_id IS NULL AND auth.uid() IS NOT NULL THEN
    BEGIN
      NEW.account_id := get_user_account_id(auth.uid());
    EXCEPTION WHEN OTHERS THEN
      BEGIN
        SELECT p.account_id INTO NEW.account_id
        FROM public.profiles p
        WHERE p.user_id = auth.uid()
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        -- leave as NULL; NOT NULL constraint will surface if needed
        NULL;
      END;
    END;
  END IF;

  -- Ensure lead_on_date
  IF NEW.lead_on_date IS NULL THEN
    NEW.lead_on_date := CURRENT_DATE;
  END IF;

  -- Ensure status default when missing
  IF NEW.status IS NULL THEN
    NEW.status := 'Working on it';
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger if it does not already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_set_lead_defaults'
  ) THEN
    CREATE TRIGGER trg_set_lead_defaults
    BEFORE INSERT ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_lead_defaults();
  END IF;
END $$;