-- Add soft delete columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deleted_by UUID REFERENCES auth.users(id);