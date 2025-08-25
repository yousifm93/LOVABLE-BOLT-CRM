-- Create enum types
CREATE TYPE user_role AS ENUM ('Admin', 'LO', 'LO Assistant', 'Processor', 'ReadOnly');
CREATE TYPE task_status AS ENUM ('Open', 'Done', 'Deferred');
CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Critical');
CREATE TYPE contact_type AS ENUM ('Agent', 'Realtor', 'Borrower', 'Other');
CREATE TYPE lead_status AS ENUM ('Working on it', 'Pending App', 'Nurture', 'Dead', 'Needs Attention');
CREATE TYPE lead_source AS ENUM ('Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Walk-in', 'Other');
CREATE TYPE referred_via AS ENUM ('Phone', 'Email', 'Social', 'Personal');
CREATE TYPE call_outcome AS ENUM ('No Answer', 'Left VM', 'Connected');
CREATE TYPE log_direction AS ENUM ('In', 'Out');

-- Create users table
CREATE TABLE public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'LO',
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pipeline_stages table
CREATE TABLE public.pipeline_stages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    order_index INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert pipeline stages
INSERT INTO public.pipeline_stages (name, order_index) VALUES
('Leads', 1),
('Pending App', 2),
('Screening', 3),
('Pre-Qualified', 4),
('Pre-Approved', 5),
('Active', 6),
('Past Clients', 7);

-- Insert seed users with unique emails
INSERT INTO public.users (first_name, last_name, email, role) VALUES
('Yousif', 'Mohamed', 'yousif@mortgagebolt.com', 'Admin'),
('Salma', 'Mohamed', 'salma@mortgagebolt.com', 'LO'),
('Herman', 'Daza', 'herman@mortgagebolt.com', 'LO Assistant');

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view their own record" ON public.users FOR SELECT USING (true);
CREATE POLICY "Pipeline stages are visible to all" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);