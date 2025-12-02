-- Create helper function to get CRM user ID from auth user ID
CREATE OR REPLACE FUNCTION public.get_crm_user_id(auth_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth_uid LIMIT 1;
$$;