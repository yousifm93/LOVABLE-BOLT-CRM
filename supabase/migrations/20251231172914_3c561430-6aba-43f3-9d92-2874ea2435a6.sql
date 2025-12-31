-- Fix activity_comments RLS policies to use CRM user ID instead of auth.uid()
-- The author_id column references public.users.id, NOT auth.users.id

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create activity comments" ON activity_comments;
DROP POLICY IF EXISTS "Users can delete their own activity comments" ON activity_comments;
DROP POLICY IF EXISTS "Users can update their own activity comments" ON activity_comments;

-- Create fixed policies using get_current_crm_user_id()
CREATE POLICY "Authenticated users can create activity comments"
  ON activity_comments FOR INSERT TO authenticated
  WITH CHECK (author_id = get_current_crm_user_id());

CREATE POLICY "Users can update their own activity comments"
  ON activity_comments FOR UPDATE TO authenticated
  USING (author_id = get_current_crm_user_id());

CREATE POLICY "Users can delete their own activity comments"
  ON activity_comments FOR DELETE TO authenticated
  USING (author_id = get_current_crm_user_id());