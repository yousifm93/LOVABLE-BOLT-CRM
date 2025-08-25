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

-- Enable RLS on all tables
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Contacts are visible to all authenticated users" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage contacts" ON public.contacts FOR ALL TO authenticated USING (true);

CREATE POLICY "Users can view assigned leads" ON public.leads FOR SELECT TO authenticated USING (
    teammate_assigned = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Users can create leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update assigned leads" ON public.leads FOR UPDATE TO authenticated USING (
    teammate_assigned = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Users can view their tasks" ON public.tasks FOR SELECT TO authenticated USING (
    assignee_id = auth.uid() OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their tasks" ON public.tasks FOR UPDATE TO authenticated USING (
    assignee_id = auth.uid() OR created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
);

-- Basic policies for activity logs (based on lead access)
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

-- Similar policies for call_logs, sms_logs, email_logs, documents
CREATE POLICY "Users can view call logs for accessible leads" ON public.call_logs FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

CREATE POLICY "Users can manage sms logs for accessible leads" ON public.sms_logs FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

CREATE POLICY "Users can manage email logs for accessible leads" ON public.email_logs FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

CREATE POLICY "Users can manage documents for accessible leads" ON public.documents FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.leads 
        WHERE id = lead_id AND (
            teammate_assigned = auth.uid() OR 
            EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin')
        )
    )
);

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