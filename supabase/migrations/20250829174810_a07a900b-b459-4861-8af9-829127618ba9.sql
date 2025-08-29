-- Update contact types enum to include new values
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'Real Estate Agent';
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'Prospect'; 
ALTER TYPE contact_type ADD VALUE IF NOT EXISTS 'Third Party';

-- Add lead_created_date column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS lead_created_date date DEFAULT CURRENT_DATE;

-- Add tags column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS tags text[];

-- Create lenders table for the new Approved Lenders functionality
CREATE TYPE lender_type AS ENUM ('Conventional', 'Non-QM', 'Private');

CREATE TABLE IF NOT EXISTS public.lenders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lender_name text NOT NULL,
  lender_type lender_type NOT NULL DEFAULT 'Conventional',
  account_executive text,
  account_executive_email text,
  account_executive_phone text,
  broker_portal_url text,
  notes text,
  status text DEFAULT 'Active',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on lenders table
ALTER TABLE public.lenders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lenders
CREATE POLICY "Anyone can manage lenders" 
ON public.lenders 
FOR ALL 
USING (true);

-- Add update trigger for lenders
CREATE TRIGGER update_lenders_updated_at
  BEFORE UPDATE ON public.lenders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample lender data
INSERT INTO public.lenders (lender_name, lender_type, account_executive, account_executive_email, account_executive_phone, broker_portal_url) VALUES
('Angel Oak Mortgage', 'Non-QM', 'Michael Johnson', 'michael.j@angeloak.com', '(555) 123-4567', 'https://portal.angeloak.com'),
('Champions Mortgage', 'Conventional', 'Sarah Williams', 'sarah.w@champions.com', '(555) 234-5678', 'https://broker.champions.com'),
('Fund Loans', 'Private', 'David Chin', 'david.c@fundloans.com', '(555) 345-6789', 'https://portal.fundloans.com'),
('PennyMac', 'Conventional', 'Lisa Rodriguez', 'lisa.r@pennymac.com', '(555) 456-7890', 'https://broker.pennymac.com');