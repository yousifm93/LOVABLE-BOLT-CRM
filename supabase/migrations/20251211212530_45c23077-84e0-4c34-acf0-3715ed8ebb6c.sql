-- First, delete tasks associated with the duplicate leads
DELETE FROM tasks 
WHERE borrower_id IN (
  SELECT id FROM leads 
  WHERE email = 'mbborrower+erik@gmail.com' 
    AND id != '579cf4d2-cd8a-41ac-9495-1bbedbe382d8'
);

-- Now delete the 4 duplicate Erik Martinez leads (keeping the latest one with buyer_agent_id)
DELETE FROM leads 
WHERE email = 'mbborrower+erik@gmail.com' 
  AND id != '579cf4d2-cd8a-41ac-9495-1bbedbe382d8';

-- Update the remaining lead with the missing fields that were in the earlier submissions
UPDATE leads 
SET discount_points_percentage = 1, 
    closing_costs = 10379,
    apr = 7.185,
    dscr_ratio = 1.3,
    hoa_dues = 1500
WHERE id = '579cf4d2-cd8a-41ac-9495-1bbedbe382d8';