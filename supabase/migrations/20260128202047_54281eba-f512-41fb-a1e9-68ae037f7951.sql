-- Enable email access for Salma and Herman
UPDATE user_permissions 
SET email = 'visible', home_inbox = 'visible'
WHERE user_id = '159376ae-30e9-4997-b61f-76ab8d7f224b';  -- Salma

UPDATE user_permissions 
SET email = 'visible', home_inbox = 'visible'
WHERE user_id = 'fa92a4c6-890d-4d69-99a8-c3adc6c904ee';  -- Herman