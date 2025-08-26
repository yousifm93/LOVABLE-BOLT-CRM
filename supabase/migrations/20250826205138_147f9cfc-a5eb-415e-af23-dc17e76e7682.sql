-- Clean up tasks table to only have the required fields
-- Remove duplicate and unnecessary columns

-- First, let's see what foreign keys exist
-- Remove unnecessary columns
ALTER TABLE public.tasks 
DROP COLUMN IF EXISTS name,
DROP COLUMN IF EXISTS assigned_to,
DROP COLUMN IF EXISTS related_lead_id,
DROP COLUMN IF EXISTS pipeline_stage,
DROP COLUMN IF EXISTS tags;

-- Ensure proper foreign key constraints exist
-- Add foreign key for assignee_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_assignee_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES public.users(id);
    END IF;
END $$;

-- Add foreign key for borrower_id if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_borrower_id_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_borrower_id_fkey 
        FOREIGN KEY (borrower_id) REFERENCES public.leads(id);
    END IF;
END $$;

-- Add foreign key for created_by if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tasks_created_by_fkey'
    ) THEN
        ALTER TABLE public.tasks 
        ADD CONSTRAINT tasks_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES public.users(id);
    END IF;
END $$;