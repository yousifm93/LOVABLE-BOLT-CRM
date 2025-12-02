-- Step 1: Add auth_user_id column to users table to link CRM users with Supabase Auth
ALTER TABLE public.users ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);

-- Step 2: Create index for fast lookups
CREATE INDEX idx_users_auth_user_id ON public.users(auth_user_id);

-- Step 3: Populate existing auth user IDs by matching emails
UPDATE public.users u
SET auth_user_id = au.id
FROM auth.users au
WHERE LOWER(u.email) = LOWER(au.email);

-- Step 4: Create helper function for team member checking
CREATE OR REPLACE FUNCTION public.is_team_member(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = user_uuid AND is_active = true
  );
$$;

-- Step 5: Update RLS policies for notes
DROP POLICY IF EXISTS "Users can manage notes for accessible leads" ON public.notes;

CREATE POLICY "Team members can manage notes"
ON public.notes FOR ALL
TO authenticated
USING (is_team_member(auth.uid()))
WITH CHECK (is_team_member(auth.uid()));

-- Step 6: Update RLS policies for sms_logs
DROP POLICY IF EXISTS "Users can manage sms logs for accessible leads" ON public.sms_logs;

CREATE POLICY "Team members can manage sms logs"
ON public.sms_logs FOR ALL
TO authenticated
USING (is_team_member(auth.uid()))
WITH CHECK (is_team_member(auth.uid()));

-- Step 7: Update RLS policies for call_logs
DROP POLICY IF EXISTS "Users can manage call logs for accessible leads" ON public.call_logs;

CREATE POLICY "Team members can manage call logs"
ON public.call_logs FOR ALL
TO authenticated
USING (is_team_member(auth.uid()))
WITH CHECK (is_team_member(auth.uid()));

-- Step 8: Update RLS policies for tasks
DROP POLICY IF EXISTS "Users can view their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.tasks;

CREATE POLICY "Team members can view all tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (is_team_member(auth.uid()));

CREATE POLICY "Team members can insert tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can update all tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (is_team_member(auth.uid()))
WITH CHECK (is_team_member(auth.uid()));

CREATE POLICY "Team members can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (is_team_member(auth.uid()));