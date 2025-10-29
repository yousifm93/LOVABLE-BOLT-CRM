-- Add yousifminc@gmail.com to users table
INSERT INTO users (id, first_name, last_name, email, role, is_active)
VALUES (
  '08e73d69-4707-4773-84a4-69ce2acd6a11',
  'Yousif',
  'Mohamed',
  'yousifminc@gmail.com',
  'Admin',
  true
)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email, updated_at = NOW();

-- Update Visionary Capital user to Juan Diego
UPDATE users
SET 
  first_name = 'Juan Diego',
  last_name = 'Yousif',
  email = 'juandiego@mortgagebolt.com',
  updated_at = NOW()
WHERE id = '31e7f1ae-8021-4214-841e-c7d440789fe3';