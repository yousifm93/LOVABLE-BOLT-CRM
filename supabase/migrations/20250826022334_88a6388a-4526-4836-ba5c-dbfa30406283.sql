-- Phase 1: Add missing schema elements only

-- Create enum for converted status if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'converted_status') THEN
        CREATE TYPE converted_status AS ENUM ('Working on it', 'Pending App', 'Nurture', 'Dead', 'Needs Attention');
    END IF;
END $$;

-- Create enum for referral source if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_source') THEN
        CREATE TYPE referral_source AS ENUM ('Agent', 'New Agent', 'Past Client', 'Personal', 'Social', 'Miscellaneous');
    END IF;
END $$;

-- Create buyer_agents table if not exists
CREATE TABLE IF NOT EXISTS public.buyer_agents (
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

-- Create policies for buyer_agents (drop existing first)
DROP POLICY IF EXISTS "Anyone can view buyer agents" ON public.buyer_agents;
DROP POLICY IF EXISTS "Authenticated users can manage buyer agents" ON public.buyer_agents;

CREATE POLICY "Anyone can view buyer agents" 
ON public.buyer_agents 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage buyer agents" 
ON public.buyer_agents 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Add missing columns to leads table (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'task_eta') THEN
        ALTER TABLE public.leads ADD COLUMN task_eta DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'converted') THEN
        ALTER TABLE public.leads ADD COLUMN converted converted_status DEFAULT 'Working on it';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'referral_source') THEN
        ALTER TABLE public.leads ADD COLUMN referral_source referral_source;
    END IF;
END $$;

-- Add missing columns to tasks table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'pipeline_stage') THEN
        ALTER TABLE public.tasks ADD COLUMN pipeline_stage TEXT DEFAULT 'Leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'task_order') THEN
        ALTER TABLE public.tasks ADD COLUMN task_order INTEGER DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'borrower_id') THEN
        ALTER TABLE public.tasks ADD COLUMN borrower_id UUID REFERENCES public.leads(id);
    END IF;
END $$;

-- Create trigger for buyer_agents if not exists
DROP TRIGGER IF EXISTS update_buyer_agents_updated_at ON public.buyer_agents;
CREATE TRIGGER update_buyer_agents_updated_at
BEFORE UPDATE ON public.buyer_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();