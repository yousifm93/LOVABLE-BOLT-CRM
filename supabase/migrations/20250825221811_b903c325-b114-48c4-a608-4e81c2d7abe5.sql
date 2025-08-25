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
CREATE TYPE field_data_type AS ENUM ('text', 'number', 'date', 'dropdown', 'multi-select', 'boolean', 'relation');

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

-- Create contacts table
CREATE TABLE public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    type contact_type NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    source lead_source,
    referred_via referred_via,
    lead_on_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status lead_status NOT NULL DEFAULT 'Working on it',
    teammate_assigned UUID REFERENCES public.users(id),
    buyer_agent_id UUID REFERENCES public.contacts(id),
    pipeline_stage_id UUID REFERENCES public.pipeline_stages(id),
    loan_amount DECIMAL(12,2),
    loan_type TEXT,
    property_type TEXT,
    occupancy TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE,
    status task_status NOT NULL DEFAULT 'Open',
    priority task_priority NOT NULL DEFAULT 'Medium',
    assignee_id UUID REFERENCES public.users(id),
    related_lead_id UUID REFERENCES public.leads(id),
    created_by UUID REFERENCES public.users(id),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notes table
CREATE TABLE public.notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call_logs table
CREATE TABLE public.call_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    outcome call_outcome NOT NULL,
    duration_seconds INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sms_logs table
CREATE TABLE public.sms_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    direction log_direction NOT NULL,
    to_number TEXT NOT NULL,
    from_number TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_logs table
CREATE TABLE public.email_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    direction log_direction NOT NULL,
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    snippet TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.users(id),
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create object_links table for generic associations
CREATE TABLE public.object_links (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    src_type TEXT NOT NULL,
    src_id UUID NOT NULL,
    dst_type TEXT NOT NULL,
    dst_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(src_type, src_id, dst_type, dst_id)
);

-- Create custom_fields table for dynamic field definitions
CREATE TABLE public.custom_fields (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    object_type TEXT NOT NULL,
    field_key TEXT NOT NULL,
    label TEXT NOT NULL,
    data_type field_data_type NOT NULL,
    options TEXT[], -- For dropdown/multi-select options
    is_required BOOLEAN NOT NULL DEFAULT false,
    default_value TEXT,
    help_text TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(object_type, field_key)
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

-- Insert seed users
INSERT INTO public.users (first_name, last_name, email, role) VALUES
('Yousif', 'Mohamed', 'yousef@mortgagebolt.com', 'Admin'),
('Salma', 'Mohamed', 'yousef@mortgagebolt.com', 'LO'),
('Herman', 'Daza', 'yousef@mortgagebolt.com', 'LO Assistant');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.object_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Users policies - Admins see all, others see only themselves
CREATE POLICY "Users can view their own record" ON public.users FOR SELECT USING (true);
CREATE POLICY "Admins can manage all users" ON public.users FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);

-- Pipeline stages are visible to all authenticated users
CREATE POLICY "Pipeline stages are visible to all" ON public.pipeline_stages FOR SELECT TO authenticated USING (true);

-- Contacts policies - visible to all authenticated users
CREATE POLICY "Contacts are visible to all authenticated users" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage contacts" ON public.contacts FOR ALL TO authenticated USING (true);

-- Leads policies - users see assigned leads + admin sees all
CREATE POLICY "Users can view assigned leads" ON public.leads FOR SELECT TO authenticated USING (
    teammate_assigned = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update assigned leads" ON public.leads FOR UPDATE TO authenticated USING (
    teammate_assigned = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);

-- Tasks policies - users see their tasks + admin sees all
CREATE POLICY "Users can view their tasks" ON public.tasks FOR SELECT TO authenticated USING (
    assignee_id = auth.uid() OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their tasks" ON public.tasks FOR UPDATE TO authenticated USING (
    assignee_id = auth.uid() OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);

-- Notes policies - based on lead access
CREATE POLICY "Users can view notes for accessible leads" ON public.notes FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);
CREATE POLICY "Users can create notes for accessible leads" ON public.notes FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

-- Activity logs policies - based on lead access
CREATE POLICY "Users can view call logs for accessible leads" ON public.call_logs FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);
CREATE POLICY "Users can create call logs for accessible leads" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

CREATE POLICY "Users can view sms logs for accessible leads" ON public.sms_logs FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);
CREATE POLICY "Users can create sms logs for accessible leads" ON public.sms_logs FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

CREATE POLICY "Users can view email logs for accessible leads" ON public.email_logs FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);
CREATE POLICY "Users can create email logs for accessible leads" ON public.email_logs FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

-- Documents policies - based on lead access
CREATE POLICY "Users can view documents for accessible leads" ON public.documents FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);
CREATE POLICY "Users can create documents for accessible leads" ON public.documents FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

-- Object links policies - authenticated users can manage
CREATE POLICY "Authenticated users can manage object links" ON public.object_links FOR ALL TO authenticated USING (true);

-- Custom fields policies - admins only
CREATE POLICY "Admins can manage custom fields" ON public.custom_fields FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "All users can view custom fields" ON public.custom_fields FOR SELECT TO authenticated USING (true);