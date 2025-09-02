-- Create email marketing tables

-- Email senders table
CREATE TABLE public.email_senders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL UNIQUE,
  domain TEXT NOT NULL,
  dkim_status TEXT DEFAULT 'pending' CHECK (dkim_status IN ('pending', 'verified', 'failed')),
  spf_status TEXT DEFAULT 'pending' CHECK (spf_status IN ('pending', 'verified', 'failed')),
  tracking_domain TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  html TEXT NOT NULL,
  json_blocks JSONB DEFAULT '[]'::jsonb,
  version INTEGER DEFAULT 1,
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email lists table
CREATE TABLE public.email_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email contacts table
CREATE TABLE public.email_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  city TEXT,
  state TEXT,
  object_type TEXT, -- 'borrower', 'agent', 'lead', etc.
  object_id UUID,
  tags TEXT[] DEFAULT '{}',
  unsubscribed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email list memberships table
CREATE TABLE public.email_list_memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES public.email_lists(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  subscribed BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMP WITH TIME ZONE,
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  source TEXT DEFAULT 'manual',
  UNIQUE(list_id, contact_id)
);

-- Email segments table
CREATE TABLE public.email_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum for campaign status
CREATE TYPE campaign_status AS ENUM ('draft', 'scheduled', 'sending', 'paused', 'sent', 'failed');

-- Email campaigns table
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  from_sender_id UUID NOT NULL REFERENCES public.email_senders(id),
  template_id UUID NOT NULL REFERENCES public.email_templates(id),
  list_id UUID NOT NULL REFERENCES public.email_lists(id),
  segment_id UUID REFERENCES public.email_segments(id),
  status campaign_status DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  totals_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum for send status
CREATE TYPE send_status AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- Email campaign sends table
CREATE TABLE public.email_campaign_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  provider_message_id TEXT,
  status send_status DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(campaign_id, contact_id)
);

-- Create enum for event types
CREATE TYPE email_event_type AS ENUM ('open', 'click', 'bounce', 'spam', 'unsubscribe', 'delivered');

-- Email events table
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.email_contacts(id) ON DELETE CASCADE,
  type email_event_type NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Email suppressions table
CREATE TABLE public.email_suppressions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'spam', 'manual')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Short links table
CREATE TABLE public.short_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  url TEXT NOT NULL,
  campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_contacts_updated_at
  BEFORE UPDATE ON public.email_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_segments_updated_at
  BEFORE UPDATE ON public.email_segments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_email_contacts_email ON public.email_contacts(email);
CREATE INDEX idx_email_contacts_object ON public.email_contacts(object_type, object_id);
CREATE INDEX idx_email_list_memberships_list ON public.email_list_memberships(list_id);
CREATE INDEX idx_email_list_memberships_contact ON public.email_list_memberships(contact_id);
CREATE INDEX idx_email_campaign_sends_campaign ON public.email_campaign_sends(campaign_id);
CREATE INDEX idx_email_events_campaign ON public.email_events(campaign_id);
CREATE INDEX idx_email_events_contact ON public.email_events(contact_id);
CREATE INDEX idx_email_events_type ON public.email_events(type);
CREATE INDEX idx_email_suppressions_email ON public.email_suppressions(email);
CREATE INDEX idx_short_links_slug ON public.short_links(slug);

-- Enable RLS on all tables
ALTER TABLE public.email_senders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_list_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaign_sends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (authenticated users can manage all)
CREATE POLICY "Authenticated users can manage email senders" ON public.email_senders FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email templates" ON public.email_templates FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email lists" ON public.email_lists FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email contacts" ON public.email_contacts FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email list memberships" ON public.email_list_memberships FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email segments" ON public.email_segments FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email campaigns" ON public.email_campaigns FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email campaign sends" ON public.email_campaign_sends FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email events" ON public.email_events FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage email suppressions" ON public.email_suppressions FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage short links" ON public.short_links FOR ALL USING (auth.uid() IS NOT NULL);

-- Insert seed data
-- Default sender
INSERT INTO public.email_senders (from_name, from_email, domain, dkim_status, spf_status, is_default) 
VALUES ('MortgageBolt', 'hello@mortgagebolt.com', 'mortgagebolt.com', 'verified', 'verified', true);

-- Sample templates
INSERT INTO public.email_templates (name, html, json_blocks) VALUES 
('Welcome Email', 
'<html><body><h1>Welcome {{first_name}}!</h1><p>Thanks for joining MortgageBolt. We''re here to help with your mortgage needs.</p><p>Best regards,<br>The MortgageBolt Team</p><hr><p style="font-size: 12px; color: #666;">You''re receiving this because you interacted with MortgageBolt. <a href="{{unsubscribe_url}}">Unsubscribe here</a> or update your email preferences.</p></body></html>', 
'[{"type":"header","content":"Welcome {{first_name}}!"},{"type":"text","content":"Thanks for joining MortgageBolt. We''re here to help with your mortgage needs."},{"type":"signature","content":"Best regards,<br>The MortgageBolt Team"}]'::jsonb),
('Newsletter Template',
'<html><body><h1>MortgageBolt Newsletter</h1><p>Hi {{first_name}},</p><p>Here are the latest updates from MortgageBolt...</p><p>Best regards,<br>The MortgageBolt Team</p><hr><p style="font-size: 12px; color: #666;">You''re receiving this because you interacted with MortgageBolt. <a href="{{unsubscribe_url}}">Unsubscribe here</a> or update your email preferences.</p></body></html>',
'[{"type":"header","content":"MortgageBolt Newsletter"},{"type":"text","content":"Hi {{first_name}},"},{"type":"text","content":"Here are the latest updates from MortgageBolt..."}]'::jsonb);

-- Sample list
INSERT INTO public.email_lists (name, description) VALUES 
('Newsletter Subscribers', 'Main newsletter subscription list'),
('Potential Clients', 'Leads and potential mortgage clients');

-- Sample contacts
INSERT INTO public.email_contacts (email, first_name, last_name, city, state, object_type) VALUES 
('john.doe@example.com', 'John', 'Doe', 'Miami', 'FL', 'lead'),
('jane.smith@example.com', 'Jane', 'Smith', 'Orlando', 'FL', 'borrower'),
('mike.jones@example.com', 'Mike', 'Jones', 'Tampa', 'FL', 'agent'),
('sarah.wilson@example.com', 'Sarah', 'Wilson', 'Jacksonville', 'FL', 'lead'),
('david.brown@example.com', 'David', 'Brown', 'Miami Beach', 'FL', 'borrower'),
('lisa.garcia@example.com', 'Lisa', 'Garcia', 'Fort Lauderdale', 'FL', 'agent'),
('robert.taylor@example.com', 'Robert', 'Taylor', 'West Palm Beach', 'FL', 'lead'),
('maria.martinez@example.com', 'Maria', 'Martinez', 'Hialeah', 'FL', 'borrower'),
('james.anderson@example.com', 'James', 'Anderson', 'Coral Gables', 'FL', 'agent'),
('jennifer.thomas@example.com', 'Jennifer', 'Thomas', 'Aventura', 'FL', 'lead');

-- Add contacts to lists
INSERT INTO public.email_list_memberships (list_id, contact_id, subscribed, subscribed_at, source)
SELECT l.id, c.id, true, now(), 'manual'
FROM public.email_lists l, public.email_contacts c 
WHERE l.name = 'Newsletter Subscribers';

-- Sample campaign
INSERT INTO public.email_campaigns (name, subject, preview_text, from_sender_id, template_id, list_id, status)
SELECT 'Welcome Campaign', 'Welcome to MortgageBolt!', 'Thanks for joining us', s.id, t.id, l.id, 'draft'
FROM public.email_senders s, public.email_templates t, public.email_lists l
WHERE s.is_default = true AND t.name = 'Welcome Email' AND l.name = 'Newsletter Subscribers';