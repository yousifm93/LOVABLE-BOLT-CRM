-- Phase 4: Create separate schema for website tables

-- 1. Create website schema
CREATE SCHEMA IF NOT EXISTS website;

-- 2. Move all website-related tables to the website schema
ALTER TABLE public.podcast_episodes SET SCHEMA website;
ALTER TABLE public.podcast_guests SET SCHEMA website;
ALTER TABLE public.podcast_topics SET SCHEMA website;
ALTER TABLE public.faqs SET SCHEMA website;
ALTER TABLE public.loan_programs SET SCHEMA website;
ALTER TABLE public.loan_features SET SCHEMA website;
ALTER TABLE public.loan_process_steps SET SCHEMA website;
ALTER TABLE public.team_members SET SCHEMA website;
ALTER TABLE public.testimonials SET SCHEMA website;
ALTER TABLE public.pages SET SCHEMA website;
ALTER TABLE public.site_stats SET SCHEMA website;
ALTER TABLE public.refi_requests SET SCHEMA website;
ALTER TABLE public.refi_documents SET SCHEMA website;
ALTER TABLE public.refi_results SET SCHEMA website;

-- 3. Add comments for clarity
COMMENT ON SCHEMA website IS 'Schema for website-related tables (separate from CRM)';

-- Note: RLS policies are preserved automatically when moving tables to a new schema