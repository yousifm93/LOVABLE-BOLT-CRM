-- Team assignments (internal users to roles)
CREATE TABLE IF NOT EXISTS team_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  role text check (role in ('loan_officer','loa1','loa2','processor','underwriting1')),
  user_id uuid references users(id),
  created_at timestamptz default now(),
  created_by uuid references users(id),
  unique (lead_id, role)
);

-- External contacts mapped to a lead
CREATE TABLE IF NOT EXISTS lead_external_contacts (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  type text check (type in ('buyers_agent','listing_agent','title','insurance')),
  contact_id uuid references contacts(id),
  created_at timestamptz default now(),
  created_by uuid references users(id),
  unique (lead_id, type)
);

-- Lead dates store
CREATE TABLE IF NOT EXISTS lead_dates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  key text check (key in ('app_received_at','docs_requested_at','docs_received_at','condo_pkg_sent_at','prequal_issued_at','preapproval_issued_at')),
  value_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references users(id),
  unique (lead_id, key)
);

-- Enable RLS on team_assignments
ALTER TABLE team_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_assignments
CREATE POLICY "Users can view team assignments for their leads" ON team_assignments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = team_assignments.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

CREATE POLICY "Users can manage team assignments for their leads" ON team_assignments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = team_assignments.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

-- Enable RLS on lead_external_contacts
ALTER TABLE lead_external_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_external_contacts
CREATE POLICY "Users can view external contacts for their leads" ON lead_external_contacts
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_external_contacts.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

CREATE POLICY "Users can manage external contacts for their leads" ON lead_external_contacts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_external_contacts.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

-- Enable RLS on lead_dates
ALTER TABLE lead_dates ENABLE ROW LEVEL SECURITY;

-- RLS policies for lead_dates
CREATE POLICY "Users can view dates for their leads" ON lead_dates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_dates.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

CREATE POLICY "Users can manage dates for their leads" ON lead_dates
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_dates.lead_id 
    AND leads.account_id = get_user_account_id(auth.uid())
  )
);

-- Create trigger for updating updated_at on lead_dates
CREATE OR REPLACE FUNCTION update_lead_dates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lead_dates_updated_at_trigger
BEFORE UPDATE ON lead_dates
FOR EACH ROW EXECUTE FUNCTION update_lead_dates_updated_at();