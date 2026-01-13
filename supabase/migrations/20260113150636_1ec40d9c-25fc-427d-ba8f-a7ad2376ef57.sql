-- Add days_back column to condo_searches table
ALTER TABLE public.condo_searches ADD COLUMN days_back integer DEFAULT 180;