-- Add past_mb_closing column to condos table
ALTER TABLE condos ADD COLUMN past_mb_closing boolean DEFAULT false;

-- Backfill by matching addresses between condos and past clients
WITH matches AS (
  SELECT DISTINCT c.id as condo_id
  FROM condos c
  INNER JOIN leads l ON 
    LOWER(TRIM(REGEXP_REPLACE(c.street_address, '[^a-zA-Z0-9 ]', '', 'g'))) = 
    LOWER(TRIM(REGEXP_REPLACE(l.subject_address_1, '[^a-zA-Z0-9 ]', '', 'g')))
  WHERE l.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
    AND l.deleted_at IS NULL
    AND l.subject_address_1 IS NOT NULL
    AND c.deleted_at IS NULL
    AND c.street_address IS NOT NULL
)
UPDATE condos SET past_mb_closing = true
WHERE id IN (SELECT condo_id FROM matches);

-- Create trigger function to auto-update past_mb_closing when leads are updated
CREATE OR REPLACE FUNCTION update_condo_past_closing()
RETURNS trigger AS $$
BEGIN
  -- When a lead moves to Past Clients stage with an address
  IF NEW.pipeline_stage_id = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd'
     AND NEW.subject_address_1 IS NOT NULL THEN
    UPDATE condos SET past_mb_closing = true
    WHERE LOWER(TRIM(REGEXP_REPLACE(street_address, '[^a-zA-Z0-9 ]', '', 'g'))) = 
          LOWER(TRIM(REGEXP_REPLACE(NEW.subject_address_1, '[^a-zA-Z0-9 ]', '', 'g')))
      AND deleted_at IS NULL
      AND street_address IS NOT NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on leads table
CREATE TRIGGER trg_update_condo_past_closing
AFTER INSERT OR UPDATE OF pipeline_stage_id, subject_address_1 ON leads
FOR EACH ROW EXECUTE FUNCTION update_condo_past_closing();