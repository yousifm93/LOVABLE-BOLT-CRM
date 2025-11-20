-- Update task names to match rule names for all automations
UPDATE public.task_automations
SET task_name = name;