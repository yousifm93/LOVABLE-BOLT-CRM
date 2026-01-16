-- Update DTI for existing leads that have income data but no DTI calculated
UPDATE leads 
SET dti = ROUND(((COALESCE(piti, 0) + COALESCE(monthly_liabilities, 0)) / NULLIF(total_monthly_income, 0)) * 100, 2)
WHERE total_monthly_income > 0 
  AND (dti IS NULL OR dti = 0)
  AND piti IS NOT NULL;