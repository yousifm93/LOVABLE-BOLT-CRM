-- Drop restrictive update policies
DROP POLICY IF EXISTS "Authenticated users can update their own agent call logs" ON public.agent_call_logs;
DROP POLICY IF EXISTS "Users can update their own agent call logs" ON public.agent_call_logs;

-- Create a permissive update policy for all authenticated users
CREATE POLICY "Authenticated users can update agent call logs"
ON public.agent_call_logs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);