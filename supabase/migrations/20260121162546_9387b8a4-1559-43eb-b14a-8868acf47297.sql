-- Disable Juan Diego user so he doesn't appear in task assignment dropdowns
UPDATE public.users 
SET is_active = false 
WHERE email = 'juandiego1@mortgagebolt.org';

-- Also fix the softDeleteLead function to use CRM user ID instead of auth user ID
-- The leads table deleted_by references users.id (CRM user ID), not auth.users.id