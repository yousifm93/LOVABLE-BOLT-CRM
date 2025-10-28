-- Fix team_assignments.lender_id to reference lenders table instead of contacts
-- First drop the existing foreign key constraint
ALTER TABLE team_assignments 
DROP CONSTRAINT IF EXISTS team_assignments_lender_id_fkey;

-- Clear any existing lender_id data that might reference contacts
UPDATE team_assignments 
SET lender_id = NULL 
WHERE lender_id IS NOT NULL;

-- Add new foreign key referencing lenders table
ALTER TABLE team_assignments
ADD CONSTRAINT team_assignments_lender_id_fkey 
FOREIGN KEY (lender_id) REFERENCES lenders(id) ON DELETE CASCADE;

-- Add likely_to_apply column to leads table
ALTER TABLE leads 
ADD COLUMN likely_to_apply TEXT CHECK (likely_to_apply IN ('High', 'Medium', 'Low'));

-- Add to crm_fields table for field management
INSERT INTO crm_fields (
  field_name,
  display_name,
  field_type,
  section,
  is_in_use,
  is_required,
  is_visible,
  sort_order
) VALUES (
  'likely_to_apply',
  'Likely to Apply',
  'select',
  'LEAD INFORMATION',
  true,
  false,
  true,
  1000
);