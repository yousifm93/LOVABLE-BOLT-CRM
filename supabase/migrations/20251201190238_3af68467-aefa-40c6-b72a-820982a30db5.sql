-- Add phone column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone text;

-- Update existing team member emails and phone numbers
UPDATE public.users 
SET email = 'Salma@mortgagebolt.org', phone = '352-213-2980', role = 'LO'
WHERE email = 'salma@mortgagebolt.com';

UPDATE public.users 
SET email = 'Herman@mortgagebolt.org', phone = '305-619-0386', role = 'LO Assistant'
WHERE email = 'herman@mortgagebolt.com';

UPDATE public.users 
SET email = 'Juan@mortgagebolt.org', phone = '305-619-7959', role = 'LO Assistant'
WHERE email = 'juandiego@mortgagebolt.com';

UPDATE public.users 
SET email = 'Processing@mortgagebolt.org', phone = '305-619-0000', role = 'Processor'
WHERE email = 'akankshawork897@gmail.com';

-- Add Yousif Mohamed as new team member
INSERT INTO public.users (first_name, last_name, email, phone, role, is_active, is_assignable)
VALUES ('Yousif', 'Mohamed', 'yousif@mortgagebolt.org', '352-328-9828', 'LO', true, true)
ON CONFLICT (email) DO UPDATE 
SET phone = EXCLUDED.phone, role = EXCLUDED.role, is_assignable = EXCLUDED.is_assignable;

-- Delete obsolete test account
DELETE FROM public.users WHERE email = 'yousifmin@gmail.com';

-- Update admin accounts with phone numbers (if needed)
UPDATE public.users 
SET phone = '352-328-9828'
WHERE email IN ('yousif@mortgagebolt.com', 'yousifminc@gmail.com') AND phone IS NULL;