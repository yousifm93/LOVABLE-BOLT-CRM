-- Create lead_conditions table
CREATE TABLE IF NOT EXISTS lead_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  condition_type text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  priority text DEFAULT 'medium',
  assigned_to uuid REFERENCES users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES users(id),
  completed_at timestamp with time zone,
  completed_by uuid REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_conditions_lead_id ON lead_conditions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_conditions_status ON lead_conditions(status);

-- Enable RLS
ALTER TABLE lead_conditions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view conditions for their account leads"
ON lead_conditions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_conditions.lead_id
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

CREATE POLICY "Users can manage conditions for their account leads"
ON lead_conditions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM leads
    WHERE leads.id = lead_conditions.lead_id
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);