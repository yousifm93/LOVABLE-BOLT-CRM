-- Add review_left_on field to leads table for tracking when borrowers leave reviews
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS review_left_on DATE;