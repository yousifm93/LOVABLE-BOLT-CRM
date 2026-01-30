-- Add updated_by column to contacts table for tracking who made changes
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- Create or replace the trigger function to auto-update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_contacts_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = get_current_crm_user_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if it exists, then create new one
DROP TRIGGER IF EXISTS contacts_updated_trigger ON contacts;

CREATE TRIGGER contacts_updated_trigger
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_contacts_modified();