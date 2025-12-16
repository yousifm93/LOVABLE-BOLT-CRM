-- Add needed_from column to lead_conditions
ALTER TABLE lead_conditions 
ADD COLUMN IF NOT EXISTS needed_from text;

-- Add comment for documentation
COMMENT ON COLUMN lead_conditions.needed_from IS 'Who is responsible for providing this condition: Borrower, Lender, or Third Party';

-- Update Cullen Mahoney's conditions with proper short names and descriptions
-- Lead ID: 1ce1e6c2-c5d1-4f39-9f90-78101269cc88

-- 1. Mortgage Statement
UPDATE lead_conditions SET 
  description = 'Mortgage Statement',
  notes = 'For properties: 600 NE 52nd Terrace, Miami FL 33137 & 877 36th Ave South, St. Pete FL 33705. If not escrowed, property taxes and insurance will need to be provided.',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%most recent mortgage statement%';

-- 2. Proof of Purchase
UPDATE lead_conditions SET 
  description = 'Proof of Purchase',
  notes = 'Property acquired less than 12 months ago. Provide documentation for purchase price used to purchase subject property.',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%acquired the property less than%';

-- 3. Proof of Mortgage Payment
UPDATE lead_conditions SET 
  description = 'Proof of Mortgage Payment',
  notes = 'Evidence mortgages paid to December 2025: (1) SELECT PORTFOLIO SVCIN #0122 - DLA 10/2025, (2) NATIONSTAR/MR COOPER #8217 - DLA 08/2025',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%evidence the following mortgages are paid%';

-- 4. Settlement Statement
UPDATE lead_conditions SET 
  description = 'Settlement Statement',
  notes = 'Less than 12-month seasoning. Provide final settlement statement from purchase. Maximum CLTV reduced by 5% from applicable eligibility matrix.',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%less than 12 months seasoning%';

-- 5. Business Narrative Form
UPDATE lead_conditions SET 
  description = 'Business Narrative Form',
  notes = 'Self-Employed Business Narrative Form required for each self-employed business: https://admortgage.com/wp-content/uploads/Self-Employed-Business-Narrative-Form.pdf',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%self-employment business narrative%';

-- 6. Proof of Primary
UPDATE lead_conditions SET 
  description = 'Proof of Primary',
  notes = 'Subject property listed for rent 11/11/2025 but transaction is owner occupied. Commercial mortgage recorded. Provide 2-month utilities to confirm primary residence.',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%subject property listed for rent%';

-- 7. LOE (Letter of Explanation)
UPDATE lead_conditions SET 
  description = 'LOE',
  notes = 'Letter of Explanation for reason subject property listed for rent. Additional conditions may apply after review.',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%provide LOE explaining%';

-- 8. Anti-Steering Form
UPDATE lead_conditions SET 
  description = 'Anti-Steering Form',
  notes = 'Signed Anti-steering Disclosure of Loan Options required.',
  needed_from = 'Lender'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%anti-steering%';

-- 9. Three-Day CD
UPDATE lead_conditions SET 
  description = 'Three-Day CD',
  notes = 'Prelim CD required for AD Mortgage to issue 3-day CD - Primary/Second Home',
  needed_from = 'Lender'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%3-day CD%';

-- 10. E&O Policy
UPDATE lead_conditions SET 
  description = 'E&O Policy',
  notes = 'Errors and Omission policy, Wire Instructions and Closing Protection Letter with accurate mortgagee and loan number. Address must match LOS system.',
  needed_from = 'Third Party'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%errors and omission%';

-- 11. Payoff Statement
UPDATE lead_conditions SET 
  description = 'Payoff Statement',
  notes = 'Payoff Statement(s) for the Subject Property',
  needed_from = 'Lender'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%payoff statement%';

-- 12. Property Survey
UPDATE lead_conditions SET 
  description = 'Property Survey',
  notes = 'Provide: (A) Property Survey, (B) Alta 9 confirmation, OR (C) Title confirmation no survey exception on final policy.',
  needed_from = 'Third Party'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%property survey%';

-- 13. Hazard Insurance
UPDATE lead_conditions SET 
  description = 'Hazard Insurance',
  notes = '12-month hazard policy with all required perils. Coverage per guidelines (RCE/replacement cost). Mortgagee: A&D Mortgage LLC, ISAOA/ATIMA, 899 W Cypress Creek Rd, Fort Lauderdale FL 33309 with loan #.',
  needed_from = 'Borrower'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%hazard insurance%';

-- 14. Appraisal Transfer
UPDATE lead_conditions SET 
  description = 'Appraisal Transfer',
  notes = 'Appraisal transfer information required if applicable.',
  needed_from = 'Lender'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%appraisal transfer%';

-- 15. Loan Information Form
UPDATE lead_conditions SET 
  description = 'Loan Information Form',
  notes = 'Standard loan information form required.',
  needed_from = 'Lender'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%loan information form%';

-- 16. Third-Party Processing Invoices
UPDATE lead_conditions SET 
  description = 'Third-Party Processing Invoices',
  notes = 'All third-party processing invoices required.',
  needed_from = 'Third Party'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND description ILIKE '%third-party processing%';

-- 17. Quitclaim Deed
UPDATE lead_conditions SET 
  description = 'Quitclaim Deed',
  notes = 'Quitclaim/warranty deed to be recorded prior to our mortgage.',
  needed_from = 'Third Party'
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND (description ILIKE '%quitclaim%' OR description ILIKE '%quit claim%');

-- Delete conditions to skip
DELETE FROM lead_conditions 
WHERE lead_id = '1ce1e6c2-c5d1-4f39-9f90-78101269cc88' 
AND (
  description ILIKE '%certificate of occupancy%'
  OR description ILIKE '%title commitment%'
  OR description ILIKE '%address validation%'
);