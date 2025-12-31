-- First, update Herman's permission to 'locked' (same as Salma)
UPDATE user_permissions 
SET admin = 'locked', updated_at = NOW()
WHERE user_id = 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';

-- Create helper function to check if user has admin access via user_permissions
CREATE OR REPLACE FUNCTION public.has_admin_access()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_permissions up
    JOIN users u ON u.id = up.user_id
    WHERE u.auth_user_id = auth.uid()
    AND up.admin IN ('visible', 'locked')
  )
$$;

-- Update team_feedback SELECT policy to use admin access check
DROP POLICY IF EXISTS "Admins can view all feedback" ON team_feedback;
DROP POLICY IF EXISTS "Users with admin access can view all feedback" ON team_feedback;

CREATE POLICY "Users with admin access can view all feedback"
  ON team_feedback FOR SELECT TO authenticated
  USING (
    has_admin_access() 
    OR user_id = get_current_crm_user_id()
  );

-- Update team_feedback_comments policies
DROP POLICY IF EXISTS "Admins can view all comments" ON team_feedback_comments;
DROP POLICY IF EXISTS "Admins can insert comments" ON team_feedback_comments;
DROP POLICY IF EXISTS "Users with admin access can view all comments" ON team_feedback_comments;
DROP POLICY IF EXISTS "Users with admin access can insert comments" ON team_feedback_comments;

CREATE POLICY "Users with admin access can view all comments"
  ON team_feedback_comments FOR SELECT TO authenticated
  USING (has_admin_access());

CREATE POLICY "Users with admin access can insert comments"
  ON team_feedback_comments FOR INSERT TO authenticated
  WITH CHECK (has_admin_access());

-- Update team_feedback_item_status policies to also use admin access
DROP POLICY IF EXISTS "Admins can view all item statuses" ON team_feedback_item_status;
DROP POLICY IF EXISTS "Admins can manage item statuses" ON team_feedback_item_status;
DROP POLICY IF EXISTS "Users with admin access can view all item statuses" ON team_feedback_item_status;
DROP POLICY IF EXISTS "Users with admin access can manage item statuses" ON team_feedback_item_status;

CREATE POLICY "Users with admin access can view all item statuses"
  ON team_feedback_item_status FOR SELECT TO authenticated
  USING (has_admin_access());

CREATE POLICY "Users with admin access can manage item statuses"
  ON team_feedback_item_status FOR ALL TO authenticated
  USING (has_admin_access())
  WITH CHECK (has_admin_access());