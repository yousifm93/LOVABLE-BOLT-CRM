-- Drop existing restrictive RLS policies on activity logging tables
DROP POLICY IF EXISTS "Users can view call logs for accessible leads" ON public.call_logs;
DROP POLICY IF EXISTS "Users can view SMS logs for accessible leads" ON public.sms_logs;
DROP POLICY IF EXISTS "Users can manage email logs for accessible leads" ON public.email_logs;
DROP POLICY IF EXISTS "Users can manage notes for accessible leads" ON public.notes;

-- Create new account-based RLS policies for call_logs
CREATE POLICY "Users can manage call logs for leads in their account"
ON public.call_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = call_logs.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = call_logs.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
);

-- Create new account-based RLS policies for sms_logs
CREATE POLICY "Users can manage sms logs for leads in their account"
ON public.sms_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = sms_logs.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = sms_logs.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
);

-- Create new account-based RLS policies for email_logs
CREATE POLICY "Users can manage email logs for leads in their account"
ON public.email_logs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = email_logs.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = email_logs.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
);

-- Create new account-based RLS policies for notes
CREATE POLICY "Users can manage notes for leads in their account"
ON public.notes
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = notes.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = notes.lead_id
    AND leads.account_id = public.get_user_account_id(auth.uid())
  )
);