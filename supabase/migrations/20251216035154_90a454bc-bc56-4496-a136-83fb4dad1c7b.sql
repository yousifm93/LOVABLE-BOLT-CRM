-- Create service_credentials table for password storage
CREATE TABLE IF NOT EXISTS public.service_credentials (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_name text NOT NULL,
  url text,
  username text NOT NULL,
  password text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_accessed_at timestamp with time zone,
  last_accessed_by uuid REFERENCES public.users(id)
);

-- Enable RLS
ALTER TABLE public.service_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins can access credentials
CREATE POLICY "Admins can manage service credentials" 
ON public.service_credentials 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid() AND users.role = 'Admin'::user_role
))
WITH CHECK (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid() AND users.role = 'Admin'::user_role
));

-- Create updated_at trigger
CREATE TRIGGER update_service_credentials_updated_at
BEFORE UPDATE ON public.service_credentials
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial sample data
INSERT INTO public.service_credentials (service_name, url, username, password, description, tags) VALUES
  ('Encompass LOS', 'https://mortgagebolt.encompass360.com', 'admin@mortgagebolt.com', 'SecurePass123!', 'Main loan origination system', ARRAY['production', 'los', 'critical']),
  ('Freddie Mac', 'https://lpapirmal.freddiemac.com', 'mortgagebolt_user', 'FreddieMac2024!', 'Automated underwriting system access', ARRAY['production', 'underwriting', 'gse']),
  ('AWS Console', 'https://console.aws.amazon.com', 'admin@mortgagebolt.com', 'AWSAdmin2024!', 'Cloud infrastructure management', ARRAY['infrastructure', 'aws', 'critical'])
ON CONFLICT DO NOTHING;