-- Fix Juan Diego's name (remove "Yousif" from last_name)
UPDATE users
SET last_name = '', updated_at = NOW()
WHERE id = '31e7f1ae-8021-4214-841e-c7d440789fe3';

-- Add is_assignable column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_assignable BOOLEAN DEFAULT true;

-- Hide backup admin from assignment dropdowns
UPDATE users
SET is_assignable = false, updated_at = NOW()
WHERE email = 'yousif@mortgagebolt.com';