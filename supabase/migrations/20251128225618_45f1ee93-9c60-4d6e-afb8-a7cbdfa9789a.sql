-- Add unique constraint on user_id to fix application data persistence
ALTER TABLE mortgage_applications 
ADD CONSTRAINT mortgage_applications_user_id_unique UNIQUE (user_id);

-- Modify handle_new_user function to NOT create CRM users automatically
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert into profiles table (for general auth)
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
  
  -- DO NOT automatically insert into users table
  -- CRM users should be created explicitly through the Admin panel
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Clean up existing borrower accounts from CRM users table
DELETE FROM users 
WHERE email LIKE 'mbborrower+%@gmail.com'
OR email LIKE 'yousifminc+%@gmail.com';