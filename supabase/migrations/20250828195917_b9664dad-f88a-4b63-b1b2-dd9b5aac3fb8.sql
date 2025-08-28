-- Create profiles table for multi-tenancy
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  account_id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text,
  last_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add account_id and created_by columns to leads table
ALTER TABLE public.leads 
ADD COLUMN account_id uuid,
ADD COLUMN created_by uuid;

-- Create function to get user's account_id
CREATE OR REPLACE FUNCTION public.get_user_account_id(user_uuid uuid)
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT account_id FROM public.profiles WHERE user_id = user_uuid);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to set lead defaults
CREATE OR REPLACE FUNCTION public.set_lead_defaults()
RETURNS TRIGGER AS $$
DECLARE
  user_account_id uuid;
BEGIN
  -- Set created_by if not provided
  IF NEW.created_by IS NULL THEN
    NEW.created_by = auth.uid();
  END IF;
  
  -- Set account_id if not provided
  IF NEW.account_id IS NULL THEN
    SELECT account_id INTO user_account_id 
    FROM public.profiles 
    WHERE user_id = auth.uid();
    
    IF user_account_id IS NOT NULL THEN
      NEW.account_id = user_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for lead defaults
CREATE TRIGGER set_lead_defaults_trigger
  BEFORE INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.set_lead_defaults();

-- Update existing leads to have account_id and created_by
UPDATE public.leads 
SET 
  account_id = (SELECT gen_random_uuid()),
  created_by = (SELECT id FROM auth.users LIMIT 1)
WHERE account_id IS NULL OR created_by IS NULL;

-- Make columns NOT NULL after setting defaults
ALTER TABLE public.leads 
ALTER COLUMN account_id SET NOT NULL,
ALTER COLUMN created_by SET NOT NULL;

-- Create indexes for performance
CREATE INDEX idx_leads_account_id ON public.leads(account_id);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_account_id ON public.profiles(account_id);

-- Drop existing RLS policies on leads
DROP POLICY IF EXISTS "Users can create any lead" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads only" ON public.leads;
DROP POLICY IF EXISTS "Users can view assigned leads only" ON public.leads;

-- Create new account-based RLS policies for leads
CREATE POLICY "Users can view leads in their account" 
ON public.leads 
FOR SELECT 
USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Users can insert leads in their account" 
ON public.leads 
FOR INSERT 
WITH CHECK (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Users can update leads in their account" 
ON public.leads 
FOR UPDATE 
USING (account_id = public.get_user_account_id(auth.uid()));

CREATE POLICY "Users can delete leads in their account" 
ON public.leads 
FOR DELETE 
USING (account_id = public.get_user_account_id(auth.uid()));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();