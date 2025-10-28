-- Add new columns for linking to lenders and contacts
ALTER TABLE team_assignments 
ADD COLUMN IF NOT EXISTS lender_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE;

-- Add constraint: exactly one entity type must be set per row
ALTER TABLE team_assignments
DROP CONSTRAINT IF EXISTS team_assignments_entity_check;

ALTER TABLE team_assignments
ADD CONSTRAINT team_assignments_entity_check 
CHECK (
  (user_id IS NOT NULL AND lender_id IS NULL AND contact_id IS NULL) OR
  (user_id IS NULL AND lender_id IS NOT NULL AND contact_id IS NULL) OR
  (user_id IS NULL AND lender_id IS NULL AND contact_id IS NOT NULL)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS team_assignments_lender_id_idx ON team_assignments(lender_id);
CREATE INDEX IF NOT EXISTS team_assignments_contact_id_idx ON team_assignments(contact_id);

-- Clean up old role assignments that are being replaced
DELETE FROM team_assignments WHERE role IN ('pre_approval_expert', 'processor');