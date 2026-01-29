-- Add is_duplicate column to condos table
ALTER TABLE condos ADD COLUMN IF NOT EXISTS is_duplicate boolean DEFAULT false;

-- Mark duplicates (keep best record per normalized condo_name)
-- Ranking logic:
-- 1. Prefer records with primary_down value
-- 2. Lower primary_down percentage is better
-- 3. Better review_type (Conventional Full > Conventional Limited > Non-QM Full > Non-QM Limited > Restricted)
-- 4. Most recently updated as tie-breaker
WITH ranked_condos AS (
  SELECT 
    id,
    condo_name,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(TRIM(condo_name))
      ORDER BY 
        -- 1. Records with primary_down come first
        CASE WHEN primary_down IS NOT NULL AND primary_down != '' THEN 0 ELSE 1 END,
        -- 2. Lower percentage is better (extract number, default 999 for nulls)
        CAST(REGEXP_REPLACE(COALESCE(NULLIF(primary_down, ''), '999%'), '[^0-9]', '', 'g') AS INTEGER),
        -- 3. Better review type hierarchy
        CASE 
          WHEN review_type = 'Conventional Full' THEN 0 
          WHEN review_type = 'Conventional Limited' THEN 1
          WHEN review_type = 'Non-QM Full' THEN 2
          WHEN review_type = 'Non-QM Limited' THEN 3
          WHEN review_type = 'Restricted' THEN 4
          ELSE 5 
        END,
        -- 4. Most recently updated wins tie-breaker
        updated_at DESC NULLS LAST
    ) as rank
  FROM condos
  WHERE deleted_at IS NULL
)
UPDATE condos
SET is_duplicate = true
WHERE id IN (
  SELECT id FROM ranked_condos WHERE rank > 1
);

-- Also mark duplicates by address (if different names but same normalized address)
WITH address_ranked AS (
  SELECT 
    id,
    street_address,
    ROW_NUMBER() OVER (
      PARTITION BY normalize_address(street_address)
      ORDER BY 
        CASE WHEN primary_down IS NOT NULL AND primary_down != '' THEN 0 ELSE 1 END,
        CAST(REGEXP_REPLACE(COALESCE(NULLIF(primary_down, ''), '999%'), '[^0-9]', '', 'g') AS INTEGER),
        CASE 
          WHEN review_type = 'Conventional Full' THEN 0 
          WHEN review_type = 'Conventional Limited' THEN 1
          WHEN review_type = 'Non-QM Full' THEN 2
          WHEN review_type = 'Non-QM Limited' THEN 3
          WHEN review_type = 'Restricted' THEN 4
          ELSE 5 
        END,
        updated_at DESC NULLS LAST
    ) as rank
  FROM condos
  WHERE deleted_at IS NULL
    AND street_address IS NOT NULL
    AND street_address != ''
)
UPDATE condos
SET is_duplicate = true
WHERE id IN (
  SELECT id FROM address_ranked WHERE rank > 1
)
AND is_duplicate = false; -- Only mark if not already marked