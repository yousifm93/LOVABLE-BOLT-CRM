-- Phase 1: Database Schema Updates for MortgageBolt CRM Upgrade

-- Create enum for converted status
CREATE TYPE converted_status AS ENUM ('Working on it', 'Pending App', 'Nurture', 'Dead', 'Needs Attention');

-- Create enum for referral source  
CREATE TYPE referral_source AS ENUM ('Agent', 'New Agent', 'Past Client', 'Personal', 'Social', 'Miscellaneous');

-- Update referred_via enum to match requirements
ALTER TYPE referred_via ADD VALUE 'Email';
ALTER TYPE referred_via ADD VALUE 'Text'; 
ALTER TYPE referred_via ADD VALUE 'Call';
ALTER TYPE referred_via ADD VALUE 'Web';
ALTER TYPE referred_via ADD VALUE 'In-Person';

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

-- Insert seed leads data with varied information
INSERT INTO public.leads (
    first_name, 
    last_name, 
    email, 
    phone, 
    loan_amount, 
    loan_type, 
    property_type, 
    occupancy,
    lead_on_date,
    status,
    source,
    referred_via,
    referral_source,
    converted,
    task_eta,
    buyer_agent_id,
    teammate_assigned,
    notes
) VALUES
('John', 'Anderson', 'john.anderson@email.com', '(555) 111-2222', 450000, 'Conventional', 'Single Family', 'Primary', '2024-01-15', 'Working on it', 'Referral', 'Email', 'Agent', 'Working on it', '2024-02-01', (SELECT id FROM buyer_agents LIMIT 1), (SELECT id FROM users LIMIT 1), 'Pre-qualified buyer looking for first home'),
('Maria', 'Garcia', 'maria.garcia@email.com', '(555) 222-3333', 680000, 'FHA', 'Condo', 'Primary', '2024-01-20', 'Working on it', 'Website', 'Web', 'Social', 'Pending App', '2024-01-30', (SELECT id FROM buyer_agents OFFSET 1 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Needs to finalize documentation'),
('Robert', 'Wilson', 'robert.wilson@email.com', '(555) 333-4444', 325000, 'VA', 'Townhouse', 'Primary', '2024-01-25', 'Working on it', 'Referral', 'Call', 'Past Client', 'Working on it', '2024-02-15', (SELECT id FROM buyer_agents OFFSET 2 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Veteran looking for move-up home'),
('Lisa', 'Brown', 'lisa.brown@email.com', '(555) 444-5555', 750000, 'Jumbo', 'Single Family', 'Primary', '2024-02-01', 'Working on it', 'Referral', 'In-Person', 'Agent', 'Nurture', '2024-02-20', (SELECT id FROM buyer_agents OFFSET 3 LIMIT 1), (SELECT id FROM users LIMIT 1), 'High-end buyer, needs luxury property'),
('James', 'Taylor', 'james.taylor@email.com', '(555) 555-6666', 285000, 'USDA', 'Single Family', 'Primary', '2024-02-05', 'Working on it', 'Website', 'Text', 'Personal', 'Working on it', '2024-02-25', (SELECT id FROM buyer_agents OFFSET 4 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Rural property purchase'),
('Amanda', 'Davis', 'amanda.davis@email.com', '(555) 666-7777', 520000, 'Conventional', 'Condo', 'Investment', '2024-02-10', 'Working on it', 'Referral', 'Email', 'New Agent', 'Dead', NULL, (SELECT id FROM buyer_agents LIMIT 1), (SELECT id FROM users LIMIT 1), 'Investment property - decided not to proceed'),
('Christopher', 'Miller', 'chris.miller@email.com', '(555) 777-8888', 395000, 'FHA', 'Townhouse', 'Primary', '2024-02-12', 'Working on it', 'Website', 'Web', 'Social', 'Needs Attention', '2024-02-28', (SELECT id FROM buyer_agents OFFSET 1 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Credit issues need addressing'),
('Patricia', 'Moore', 'patricia.moore@email.com', '(555) 888-9999', 620000, 'Conventional', 'Single Family', 'Primary', '2024-02-15', 'Working on it', 'Referral', 'Call', 'Agent', 'Pending App', '2024-03-01', (SELECT id FROM buyer_agents OFFSET 2 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Application submitted, awaiting underwriter'),
('Daniel', 'Jackson', 'daniel.jackson@email.com', '(555) 999-0000', 445000, 'VA', 'Single Family', 'Primary', '2024-02-18', 'Working on it', 'Referral', 'In-Person', 'Past Client', 'Working on it', '2024-03-05', (SELECT id FROM buyer_agents OFFSET 3 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Repeat client, smooth process expected'),
('Michelle', 'White', 'michelle.white@email.com', '(555) 101-1010', 365000, 'FHA', 'Condo', 'Primary', '2024-02-20', 'Working on it', 'Website', 'Email', 'Miscellaneous', 'Nurture', '2024-03-10', (SELECT id FROM buyer_agents OFFSET 4 LIMIT 1), (SELECT id FROM users LIMIT 1), 'First-time buyer, needs education'),
('Kevin', 'Thompson', 'kevin.thompson@email.com', '(555) 121-2121', 580000, 'Conventional', 'Single Family', 'Secondary', '2024-02-22', 'Working on it', 'Referral', 'Text', 'Agent', 'Working on it', '2024-03-15', (SELECT id FROM buyer_agents LIMIT 1), (SELECT id FROM users LIMIT 1), 'Second home purchase'),
('Rachel', 'Harris', 'rachel.harris@email.com', '(555) 131-3131', 725000, 'Jumbo', 'Single Family', 'Primary', '2024-02-25', 'Working on it', 'Website', 'Web', 'Social', 'Pending App', '2024-03-20', (SELECT id FROM buyer_agents OFFSET 1 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Luxury home buyer'),
('Brandon', 'Clark', 'brandon.clark@email.com', '(555) 141-4141', 310000, 'USDA', 'Single Family', 'Primary', '2024-02-26', 'Working on it', 'Referral', 'Call', 'Personal', 'Working on it', '2024-03-25', (SELECT id FROM buyer_agents OFFSET 2 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Rural home purchase'),
('Stephanie', 'Lewis', 'stephanie.lewis@email.com', '(555) 151-5151', 485000, 'Conventional', 'Townhouse', 'Primary', '2024-02-28', 'Working on it', 'Website', 'Email', 'New Agent', 'Needs Attention', '2024-04-01', (SELECT id FROM buyer_agents OFFSET 3 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Income verification needed'),
('Eric', 'Walker', 'eric.walker@email.com', '(555) 161-6161', 415000, 'VA', 'Condo', 'Primary', '2024-03-01', 'Working on it', 'Referral', 'In-Person', 'Past Client', 'Working on it', '2024-04-05', (SELECT id FROM buyer_agents OFFSET 4 LIMIT 1), (SELECT id FROM users LIMIT 1), 'Military relocation');

-- Update tasks table with pipeline_stage column
ALTER TABLE public.tasks ADD COLUMN pipeline_stage TEXT DEFAULT 'Leads';
ALTER TABLE public.tasks ADD COLUMN task_order INTEGER DEFAULT 1;
ALTER TABLE public.tasks ADD COLUMN borrower_id UUID REFERENCES public.leads(id);

-- Add task priority enum values if not exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_priority') THEN
        CREATE TYPE task_priority AS ENUM ('High', 'Medium', 'Low');
    END IF;
END $$;

-- Add task status enum values if not exist  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
        CREATE TYPE task_status AS ENUM ('Done', 'Done for Now', 'In Progress', 'Didn''t Get to It', 'Need Help', 'Open');
    END IF;
END $$;

-- Insert seed tasks data
INSERT INTO public.tasks (
    title,
    description, 
    priority,
    status,
    due_date,
    assignee_id,
    created_by,
    related_lead_id,
    borrower_id,
    pipeline_stage,
    task_order,
    tags
) VALUES
('Follow up on application', 'Contact client about missing documents', 'High', 'In Progress', '2024-02-01', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads LIMIT 1), (SELECT id FROM leads LIMIT 1), 'Pending App', 1, ARRAY['urgent', 'documents']),
('Credit report review', 'Review and analyze credit report for approval', 'Medium', 'Open', '2024-02-05', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 1 LIMIT 1), (SELECT id FROM leads OFFSET 1 LIMIT 1), 'Screening', 2, ARRAY['credit', 'review']),
('Property appraisal scheduling', 'Schedule appraisal for property', 'High', 'Open', '2024-02-10', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 2 LIMIT 1), (SELECT id FROM leads OFFSET 2 LIMIT 1), 'Pre-Qualified', 1, ARRAY['appraisal', 'property']),
('Income verification', 'Verify employment and income documentation', 'Medium', 'Done for Now', '2024-01-30', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 3 LIMIT 1), (SELECT id FROM leads OFFSET 3 LIMIT 1), 'Pre-Approved', 3, ARRAY['income', 'employment']),
('Closing coordination', 'Coordinate with title company for closing', 'High', 'In Progress', '2024-02-15', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 4 LIMIT 1), (SELECT id FROM leads OFFSET 4 LIMIT 1), 'Active', 1, ARRAY['closing', 'title']),
('Post-closing follow up', 'Follow up with client after successful closing', 'Low', 'Done', '2024-01-25', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 5 LIMIT 1), (SELECT id FROM leads OFFSET 5 LIMIT 1), 'Past Client', 1, ARRAY['follow-up', 'satisfaction']),
('Document collection', 'Collect remaining required documents', 'High', 'Need Help', '2024-02-20', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 6 LIMIT 1), (SELECT id FROM leads OFFSET 6 LIMIT 1), 'Leads', 2, ARRAY['documents', 'collection']),
('Rate lock expiration check', 'Check rate lock expiration date', 'Medium', 'Open', '2024-02-25', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 7 LIMIT 1), (SELECT id FROM leads OFFSET 7 LIMIT 1), 'Active', 2, ARRAY['rate-lock', 'timeline']),
('Pre-approval letter update', 'Update pre-approval letter with new terms', 'Medium', 'In Progress', '2024-03-01', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 8 LIMIT 1), (SELECT id FROM leads OFFSET 8 LIMIT 1), 'Pre-Approved', 1, ARRAY['pre-approval', 'update']),
('Initial consultation scheduling', 'Schedule initial consultation call', 'Low', 'Didn''t Get to It', '2024-03-05', (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT id FROM leads OFFSET 9 LIMIT 1), (SELECT id FROM leads OFFSET 9 LIMIT 1), 'Leads', 3, ARRAY['consultation', 'scheduling']);