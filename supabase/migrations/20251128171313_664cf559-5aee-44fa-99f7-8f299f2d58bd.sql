-- Fix duplicate default views in pipeline_views table
-- Keep only the most recently updated default per pipeline_type

-- First, identify which views should remain as default (most recently updated per pipeline_type)
WITH latest_defaults AS (
  SELECT DISTINCT ON (pipeline_type) 
    id,
    pipeline_type
  FROM pipeline_views
  WHERE is_default = true
  ORDER BY pipeline_type, updated_at DESC
)

-- Update all views to is_default = false except the latest ones
UPDATE pipeline_views
SET is_default = false
WHERE is_default = true
  AND id NOT IN (SELECT id FROM latest_defaults);