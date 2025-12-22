-- One-time cleanup: Mark all Done tasks as reviewed to move them to Completed section
UPDATE tasks 
SET reviewed = true 
WHERE status = 'Done' 
  AND (reviewed = false OR reviewed IS NULL);