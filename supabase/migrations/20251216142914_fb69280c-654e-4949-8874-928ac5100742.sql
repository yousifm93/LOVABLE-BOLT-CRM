-- Fix RLS policy for lead_conditions to support INSERT operations
-- Drop existing ALL policy that may be causing issues
DROP POLICY IF EXISTS "Users can manage conditions for their account leads" ON lead_conditions;

-- Create separate policies with proper WITH CHECK clauses
CREATE POLICY "Users can select conditions for their account leads" ON lead_conditions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_conditions.lead_id 
      AND leads.account_id = get_user_account_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert conditions for their account leads" ON lead_conditions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_conditions.lead_id 
      AND leads.account_id = get_user_account_id(auth.uid())
    )
  );

CREATE POLICY "Users can update conditions for their account leads" ON lead_conditions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_conditions.lead_id 
      AND leads.account_id = get_user_account_id(auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_conditions.lead_id 
      AND leads.account_id = get_user_account_id(auth.uid())
    )
  );

CREATE POLICY "Users can delete conditions for their account leads" ON lead_conditions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_conditions.lead_id 
      AND leads.account_id = get_user_account_id(auth.uid())
    )
  );

-- Update Active loan task automations to use Herman, High priority, and due today
UPDATE task_automations
SET 
  assigned_to_user_id = 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee',
  task_priority = 'High',
  due_date_offset_days = 0
WHERE category = 'active_loan';