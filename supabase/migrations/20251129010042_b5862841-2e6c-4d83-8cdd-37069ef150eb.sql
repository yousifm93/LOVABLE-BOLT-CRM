-- Clear app_complete_at for all leads except Sammy Yarbou
-- This ensures only the Sammy Yarbou application (from the mortgage app portal) shows in Recent Applications
UPDATE leads 
SET app_complete_at = NULL 
WHERE id != 'd0831d44-2863-48be-970b-e468bb97cec3'
AND app_complete_at IS NOT NULL;