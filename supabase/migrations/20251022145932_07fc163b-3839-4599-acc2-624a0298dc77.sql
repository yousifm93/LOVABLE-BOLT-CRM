-- Drop existing account-based RLS policies on leads table
DROP POLICY IF EXISTS "Users can view leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete all leads" ON public.leads;

-- Create new team-wide RLS policies for leads
CREATE POLICY "team_read_leads" ON public.leads 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "team_insert_leads" ON public.leads 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "team_update_leads" ON public.leads 
  FOR UPDATE TO authenticated 
  USING (true) WITH CHECK (true);

CREATE POLICY "team_delete_leads" ON public.leads 
  FOR DELETE TO authenticated 
  USING (true);

-- Drop existing policies on contacts table
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "team_read_contacts" ON public.contacts;

-- Create team-wide policy for contacts
CREATE POLICY "team_read_contacts" ON public.contacts 
  FOR SELECT TO authenticated 
  USING (true);

-- Drop existing policies on buyer_agents table
DROP POLICY IF EXISTS "Authenticated users can view all buyer agents" ON public.buyer_agents;
DROP POLICY IF EXISTS "team_read_buyer_agents" ON public.buyer_agents;

-- Create team-wide policy for buyer_agents
CREATE POLICY "team_read_buyer_agents" ON public.buyer_agents 
  FOR SELECT TO authenticated 
  USING (true);

-- Drop existing policies on users table
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "team_read_users" ON public.users;

-- Create team-wide policy for users
CREATE POLICY "team_read_users" ON public.users 
  FOR SELECT TO authenticated 
  USING (true);