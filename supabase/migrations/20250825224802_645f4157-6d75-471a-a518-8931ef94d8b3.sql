-- Fix RLS policies to work with authentication

-- First, fix the users table RLS policy to allow viewing all users for now
DROP POLICY IF EXISTS "Users can view their own record" ON public.users;
CREATE POLICY "Users can view all users" ON public.users FOR SELECT USING (true);

-- Allow inserting users (needed for registration)
CREATE POLICY "Allow user creation" ON public.users FOR INSERT WITH CHECK (true);

-- Allow updating users
CREATE POLICY "Allow user updates" ON public.users FOR UPDATE USING (true);

-- Fix leads table policies to be more permissive for development
DROP POLICY IF EXISTS "Users can view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update assigned leads" ON public.leads;

CREATE POLICY "Users can view all leads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Users can create any lead" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update any lead" ON public.leads FOR UPDATE USING (true);

-- Fix contacts table policies to be more permissive
DROP POLICY IF EXISTS "Authenticated users can manage contacts" ON public.contacts;
DROP POLICY IF EXISTS "Contacts are visible to all authenticated users" ON public.contacts;

CREATE POLICY "Anyone can manage contacts" ON public.contacts FOR ALL USING (true);

-- Fix other activity tables to be accessible
UPDATE public.notes SET author_id = (SELECT id FROM public.users LIMIT 1) WHERE author_id IS NULL;
UPDATE public.call_logs SET user_id = (SELECT id FROM public.users LIMIT 1) WHERE user_id IS NULL;
UPDATE public.sms_logs SET user_id = (SELECT id FROM public.users LIMIT 1) WHERE user_id IS NULL;
UPDATE public.email_logs SET user_id = (SELECT id FROM public.users LIMIT 1) WHERE user_id IS NULL;