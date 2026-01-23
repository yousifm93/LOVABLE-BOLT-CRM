-- Update Ashley's home permission to visible (so she can navigate to Home page)
-- while keeping all individual section permissions locked (except Active Files)
UPDATE user_permissions 
SET home = 'visible'
WHERE user_id = '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a';