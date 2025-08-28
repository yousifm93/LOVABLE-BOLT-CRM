-- Insert missing profile for existing user
INSERT INTO public.profiles (user_id, account_id, first_name, last_name)
VALUES (
  '31e7f1ae-8021-4214-841e-c7d440789fe3'::uuid,
  gen_random_uuid(),
  'Yousif',
  'User'
)
ON CONFLICT (user_id) DO NOTHING;

-- Also handle any other existing users in auth.users that might not have profiles
INSERT INTO public.profiles (user_id, account_id, first_name, last_name)
SELECT 
  au.id,
  gen_random_uuid(),
  COALESCE(au.raw_user_meta_data ->> 'first_name', 'Unknown'),
  COALESCE(au.raw_user_meta_data ->> 'last_name', 'User')
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;