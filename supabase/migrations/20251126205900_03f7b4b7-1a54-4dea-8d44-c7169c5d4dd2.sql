-- Create application_users table for borrower accounts (separate from CRM users)
CREATE TABLE IF NOT EXISTS public.application_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create mortgage_applications table
CREATE TABLE IF NOT EXISTS public.mortgage_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.application_users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'imported')),
  loan_purpose TEXT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  application_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  imported_to_crm_at TIMESTAMPTZ,
  imported_lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.application_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortgage_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_users
CREATE POLICY "Users can view their own profile"
  ON public.application_users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.application_users FOR UPDATE
  USING (auth.uid() = id);

-- RLS Policies for mortgage_applications
CREATE POLICY "Users can view their own applications"
  ON public.mortgage_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications"
  ON public.mortgage_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own draft applications"
  ON public.mortgage_applications FOR UPDATE
  USING (auth.uid() = user_id AND status = 'draft');

CREATE POLICY "CRM admins can view all applications"
  ON public.mortgage_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'Admin'
    )
  );

CREATE POLICY "CRM admins can update all applications"
  ON public.mortgage_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'Admin'
    )
  );

-- Trigger to create application_users on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_application_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.application_users (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, application_users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, application_users.last_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_for_application
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_application_user();

-- Trigger for updated_at on application_users
CREATE TRIGGER update_application_users_updated_at
  BEFORE UPDATE ON public.application_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on mortgage_applications
CREATE TRIGGER update_mortgage_applications_updated_at
  BEFORE UPDATE ON public.mortgage_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();