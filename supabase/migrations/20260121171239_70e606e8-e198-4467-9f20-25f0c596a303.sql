-- Drop the duplicate trigger that causes task automation to create 2 tasks
DROP TRIGGER IF EXISTS trigger_pipeline_stage_automations ON public.leads;