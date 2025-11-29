-- Fix Joey Whiney's existing record with corrected calculated values
UPDATE leads 
SET 
  subject_city = COALESCE(subject_city, 'TBD'),
  subject_state = COALESCE(subject_state, 'TBD'),
  subject_zip = COALESCE(subject_zip, 'TBD'),
  principal_interest = CASE 
    WHEN loan_amount IS NOT NULL THEN 
      ROUND((loan_amount * (0.07/12) * POWER(1 + 0.07/12, 360)) / (POWER(1 + 0.07/12, 360) - 1))
    ELSE principal_interest
  END,
  homeowners_insurance = COALESCE(homeowners_insurance, 100),
  property_taxes = CASE
    WHEN sales_price IS NOT NULL THEN ROUND(sales_price * 0.01 / 12)
    ELSE property_taxes
  END,
  interest_rate = COALESCE(interest_rate, 7.0),
  term = COALESCE(term, 360)
WHERE pipeline_stage_id = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995' -- Screening stage
  AND app_complete_at IS NOT NULL;