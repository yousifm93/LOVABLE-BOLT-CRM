-- Backfill down payment percentages for Conventional condos
-- This updates condos that are missing down payment values based on their review type

-- Update Conventional Full condos with missing down payments
UPDATE condos
SET 
  primary_down = '3%',
  second_down = '10%',
  investment_down = '15%',
  updated_at = NOW()
WHERE review_type = 'Conventional Full'
  AND deleted_at IS NULL
  AND (primary_down IS NULL OR primary_down = '');

-- Update Conventional Limited condos with missing down payments
UPDATE condos
SET 
  primary_down = '10%',
  second_down = '25%',
  investment_down = '30%',
  updated_at = NOW()
WHERE review_type = 'Conventional Limited'
  AND deleted_at IS NULL
  AND (primary_down IS NULL OR primary_down = '');