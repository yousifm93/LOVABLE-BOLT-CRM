-- Add contingency_requirements column to tasks table
-- This will store an array of contingency IDs that must be met before the task can be completed
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS contingency_requirements jsonb DEFAULT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN public.tasks.contingency_requirements IS 'JSON array of contingency IDs that must be met on the lead before this task can be completed. Example: ["finance_contingency", "appraisal_received"]';