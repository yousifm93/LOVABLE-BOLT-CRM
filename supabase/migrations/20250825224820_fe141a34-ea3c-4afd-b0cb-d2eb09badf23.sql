-- Fix the function search path security issue
-- Update the existing function to have a fixed search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;