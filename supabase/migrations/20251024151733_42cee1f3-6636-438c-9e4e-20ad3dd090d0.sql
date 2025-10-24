-- Create central field registry table
CREATE TABLE IF NOT EXISTS crm_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  section TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,
  is_system_field BOOLEAN DEFAULT false,
  is_in_use BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 1000,
  dropdown_options JSONB,
  validation_rules JSONB,
  file_config JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit table for tracking field changes
CREATE TABLE IF NOT EXISTS crm_fields_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id UUID REFERENCES crm_fields(id),
  action TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  before_data JSONB,
  after_data JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_fields_section ON crm_fields(section);
CREATE INDEX IF NOT EXISTS idx_crm_fields_visible ON crm_fields(is_visible);
CREATE INDEX IF NOT EXISTS idx_crm_fields_sort_order ON crm_fields(sort_order);
CREATE INDEX IF NOT EXISTS idx_crm_fields_field_name ON crm_fields(field_name);

-- Enable RLS
ALTER TABLE crm_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_fields_audit ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Authenticated users can read, admins can manage
CREATE POLICY "Authenticated users can view fields" ON crm_fields
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage fields" ON crm_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'Admin'
    )
  );

CREATE POLICY "Admins can view audit log" ON crm_fields_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'Admin'
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crm_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_crm_fields_timestamp
  BEFORE UPDATE ON crm_fields
  FOR EACH ROW
  EXECUTE FUNCTION update_crm_fields_updated_at();