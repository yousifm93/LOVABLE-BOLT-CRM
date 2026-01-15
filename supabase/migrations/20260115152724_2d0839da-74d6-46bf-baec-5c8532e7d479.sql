-- Drop the restrictive delete policy that only allows users to delete their own logs
DROP POLICY IF EXISTS "Authenticated users can delete their own agent call logs" ON public.agent_call_logs;

-- Create a more permissive delete policy for all authenticated users
CREATE POLICY "Authenticated users can delete agent call logs"
ON public.agent_call_logs
FOR DELETE
TO authenticated
USING (true);