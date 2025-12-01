-- Fix admin assignability
UPDATE users SET is_assignable = false WHERE email = 'yousifminc@gmail.com';

-- Add display_password column
ALTER TABLE users ADD COLUMN display_password text;

-- Set passwords for non-admin users and yousif@mortgagebolt.org
UPDATE users 
SET display_password = 'Yousmo93!!' 
WHERE role != 'Admin' OR email = 'yousif@mortgagebolt.org';