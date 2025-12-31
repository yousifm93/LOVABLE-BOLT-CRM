-- Fix RLS policies for agent_call_logs to check CRM user ID properly
-- The issue: RLS policy checks logged_by = auth.uid(), but logged_by stores CRM user ID (users.id), not auth user ID (auth.users.id)

-- Drop existing policies on agent_call_logs
DROP POLICY IF EXISTS "Users can view agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Users can create agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Users can update agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Users can delete agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Authenticated users can view agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Authenticated users can create agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Authenticated users can update agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Authenticated users can delete agent call logs" ON public.agent_call_logs;

-- Create new RLS policies that properly check CRM user ID through auth_user_id
-- First create a security definer function to get the current CRM user ID
CREATE OR REPLACE FUNCTION public.get_current_crm_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- Create policies for agent_call_logs
CREATE POLICY "Authenticated users can view agent call logs"
ON public.agent_call_logs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create agent call logs"
ON public.agent_call_logs
FOR INSERT
TO authenticated
WITH CHECK (logged_by = public.get_current_crm_user_id());

CREATE POLICY "Authenticated users can update their own agent call logs"
ON public.agent_call_logs
FOR UPDATE
TO authenticated
USING (logged_by = public.get_current_crm_user_id());

CREATE POLICY "Authenticated users can delete their own agent call logs"
ON public.agent_call_logs
FOR DELETE
TO authenticated
USING (logged_by = public.get_current_crm_user_id());

-- Also fix leads table policy for notes_updated_by if it exists
-- The notes_updated_by column references users.id, not auth.users.id
DROP POLICY IF EXISTS "Users can update leads notes" ON public.leads;