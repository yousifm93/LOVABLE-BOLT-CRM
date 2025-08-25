-- Update seed users with unique emails
UPDATE public.users SET email = 'yousif@mortgagebolt.com' WHERE first_name = 'Yousif' AND last_name = 'Mohamed';
UPDATE public.users SET email = 'salma@mortgagebolt.com' WHERE first_name = 'Salma' AND last_name = 'Mohamed';
UPDATE public.users SET email = 'herman@mortgagebolt.com' WHERE first_name = 'Herman' AND last_name = 'Daza';