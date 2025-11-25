-- Phase 4: Create condition status history table

CREATE TABLE lead_condition_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  condition_id UUID NOT NULL REFERENCES lead_conditions(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE lead_condition_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy - users can view history for conditions they can access
CREATE POLICY "Users can view condition status history" ON lead_condition_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lead_conditions lc
      JOIN leads l ON l.id = lc.lead_id
      WHERE lc.id = lead_condition_status_history.condition_id
      AND l.account_id = get_user_account_id(auth.uid())
    )
  );

-- RLS Policy - users can insert history for conditions they can access
CREATE POLICY "Users can insert condition status history" ON lead_condition_status_history
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Index for fast lookups
CREATE INDEX idx_condition_status_history_condition_id ON lead_condition_status_history(condition_id);