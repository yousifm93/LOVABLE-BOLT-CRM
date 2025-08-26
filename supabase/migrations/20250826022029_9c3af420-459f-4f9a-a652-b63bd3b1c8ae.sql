-- Phase 1: Database Schema Updates for MortgageBolt CRM Upgrade (Fixed)

-- Create enum for converted status
CREATE TYPE converted_status AS ENUM ('Working on it', 'Pending App', 'Nurture', 'Dead', 'Needs Attention');

-- Create enum for referral source  
CREATE TYPE referral_source AS ENUM ('Agent', 'New Agent', 'Past Client', 'Personal', 'Social', 'Miscellaneous');

-- Create buyer_agents table
CREATE TABLE public.buyer_agents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    brokerage TEXT NOT NULL,
    license_number TEXT,
    years_experience INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on buyer_agents
ALTER TABLE public.buyer_agents ENABLE ROW LEVEL SECURITY;

-- Create policy for buyer_agents
CREATE POLICY "Anyone can view buyer agents" 
ON public.buyer_agents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage buyer agents" 
ON public.buyer_agents 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add new columns to leads table
ALTER TABLE public.leads ADD COLUMN task_eta DATE;
ALTER TABLE public.leads ADD COLUMN converted converted_status DEFAULT 'Working on it';
ALTER TABLE public.leads ADD COLUMN referral_source referral_source;
ALTER TABLE public.leads ADD COLUMN buyer_agent_id UUID REFERENCES public.buyer_agents(id);

-- Update trigger for buyer_agents
CREATE TRIGGER update_buyer_agents_updated_at
BEFORE UPDATE ON public.buyer_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert seed data for buyer_agents
INSERT INTO public.buyer_agents (first_name, last_name, email, phone, brokerage, license_number, years_experience) VALUES
('Sarah', 'Martinez', 'sarah.martinez@realtycorp.com', '(555) 123-4567', 'Realty Corp', 'RE12345678', 8),
('Michael', 'Johnson', 'michael.johnson@primeproperties.com', '(555) 234-5678', 'Prime Properties', 'RE23456789', 12),
('Emily', 'Chen', 'emily.chen@coastalrealty.com', '(555) 345-6789', 'Coastal Realty', 'RE34567890', 5),
('David', 'Rodriguez', 'david.rodriguez@metrogroup.com', '(555) 456-7890', 'Metro Group', 'RE45678901', 15),
('Jessica', 'Thompson', 'jessica.thompson@elitehomes.com', '(555) 567-8901', 'Elite Homes', 'RE56789012', 7);

-- Update tasks table with pipeline_stage column
ALTER TABLE public.tasks ADD COLUMN pipeline_stage TEXT DEFAULT 'Leads';
ALTER TABLE public.tasks ADD COLUMN task_order INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN borrower_id UUID REFERENCES public.leads(id);