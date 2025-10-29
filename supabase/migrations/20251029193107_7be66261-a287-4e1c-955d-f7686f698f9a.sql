-- Step 1: Clean up duplicate profiles (keep first by created_at)
DELETE FROM profiles 
WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) as rn
    FROM profiles
  ) t
  WHERE rn = 1
);

-- Step 2: Update profiles table to include email
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Step 3: Create or replace trigger function to sync auth.users → profiles and users tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles table
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);
  
  -- Insert or update users table (for CRM team members)
  INSERT INTO public.users (id, first_name, last_name, email, role, is_active)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    'LO', -- Default role (display purposes only)
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    first_name = COALESCE(EXCLUDED.first_name, users.first_name),
    last_name = COALESCE(EXCLUDED.last_name, users.last_name),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Step 4: Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Step 5: Update RLS policies to ensure shared access for all authenticated users
-- Note: All team members have equal access - no role-based restrictions

-- leads table - shared access
DROP POLICY IF EXISTS "team_access_leads" ON leads;
CREATE POLICY "team_access_leads" ON leads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- tasks table - shared access
DROP POLICY IF EXISTS "team_access_tasks" ON tasks;
CREATE POLICY "team_access_tasks" ON tasks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- users table - all authenticated users can read all users
DROP POLICY IF EXISTS "team_read_all_users" ON users;
CREATE POLICY "team_read_all_users" ON users
  FOR SELECT
  TO authenticated
  USING (true);

-- users table - authenticated users can update themselves
DROP POLICY IF EXISTS "team_update_self" ON users;
CREATE POLICY "team_update_self" ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- profiles table - all authenticated users can read all profiles
DROP POLICY IF EXISTS "team_read_all_profiles" ON profiles;
CREATE POLICY "team_read_all_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);