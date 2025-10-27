-- Fix RLS policies for activity logs to allow logging on assigned leads

-- 1. Update call_logs RLS policy
DROP POLICY IF EXISTS "Users can manage call logs for leads in their account" ON call_logs;

CREATE POLICY "Users can manage call logs for accessible leads"
ON call_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = call_logs.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = call_logs.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
);

-- 2. Update email_logs RLS policy
DROP POLICY IF EXISTS "Users can manage email logs for leads in their account" ON email_logs;

CREATE POLICY "Users can manage email logs for accessible leads"
ON email_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = email_logs.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = email_logs.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
);

-- 3. Update sms_logs RLS policy
DROP POLICY IF EXISTS "Users can manage sms logs for leads in their account" ON sms_logs;
DROP POLICY IF EXISTS "Users can manage sms logs for accessible leads" ON sms_logs;

CREATE POLICY "Users can manage sms logs for accessible leads"
ON sms_logs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = sms_logs.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = sms_logs.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
);

-- 4. Update notes RLS policies
DROP POLICY IF EXISTS "Users can manage notes for leads in their account" ON notes;
DROP POLICY IF EXISTS "Users can create notes for accessible leads" ON notes;
DROP POLICY IF EXISTS "Users can view notes for accessible leads" ON notes;

CREATE POLICY "Users can manage notes for accessible leads"
ON notes FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = notes.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = notes.lead_id 
    AND (
      leads.account_id = get_user_account_id(auth.uid())
      OR leads.teammate_assigned = auth.uid()
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE users.id = auth.uid() 
        AND users.role = 'Admin'
      )
    )
  )
);