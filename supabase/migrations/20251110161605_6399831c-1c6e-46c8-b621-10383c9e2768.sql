-- Add INSERT policy for stage_history table
-- This allows authenticated users to insert stage history records for leads in their account

CREATE POLICY "Users can insert stage history for their account's leads"
ON public.stage_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.leads 
    WHERE leads.id = stage_history.lead_id 
    AND leads.account_id = (
      SELECT account_id 
      FROM public.profiles 
      WHERE user_id = auth.uid()
    )
  )
);