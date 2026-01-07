-- Fix close_date values that are 1 day behind
-- Add 1 day to all close_date values in the leads table
UPDATE leads 
SET close_date = (close_date::date + INTERVAL '1 day')::date
WHERE close_date IS NOT NULL;