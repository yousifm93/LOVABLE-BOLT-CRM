-- Drop existing account-based RLS policies on leads table
DROP POLICY IF EXISTS "Users can view leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Users can insert leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Users can update leads in their account" ON public.leads;
DROP POLICY IF EXISTS "Users can delete leads in their account" ON public.leads;

-- Drop any existing team-wide policies (in case we're re-running)
DROP POLICY IF EXISTS "Authenticated users can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete all leads" ON public.leads;

-- Create team-wide RLS policies for leads table
CREATE POLICY "Authenticated users can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update all leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all leads"
ON public.leads
FOR DELETE
TO authenticated
USING (true);

-- Ensure related tables are readable by all authenticated users
-- users table - drop old policy and create new one
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
CREATE POLICY "Authenticated users can view all users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- buyer_agents table
DROP POLICY IF EXISTS "Anyone can manage buyer agents" ON public.buyer_agents;
DROP POLICY IF EXISTS "Authenticated users can view all buyer agents" ON public.buyer_agents;
CREATE POLICY "Authenticated users can view all buyer agents"
ON public.buyer_agents
FOR SELECT
TO authenticated
USING (true);

-- contacts table
DROP POLICY IF EXISTS "Anyone can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Authenticated users can view all contacts" ON public.contacts;
CREATE POLICY "Authenticated users can view all contacts"
ON public.contacts
FOR SELECT
TO authenticated
USING (true);