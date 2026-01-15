-- Add job_title column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Backfill job titles from existing descriptions/known contacts
UPDATE contacts SET job_title = 'Credit Verification Manager' 
WHERE email = 'kristina@advcredit.com' AND job_title IS NULL;

UPDATE contacts SET job_title = 'Senior Vice President' 
WHERE email = 'aperrella@harvestcref.com' AND job_title IS NULL;

UPDATE contacts SET job_title = 'Pre-Approval Expert' 
WHERE email = 'herman@mortgagebolt.com' AND job_title IS NULL;

UPDATE contacts SET job_title = 'Junior Funder' 
WHERE email = 'anastasiya.kamasheva@admortgage.com' AND job_title IS NULL;

UPDATE contacts SET job_title = 'Paralegal / Title Processor' 
WHERE email = 'admin2@lopezlawfl.com' AND job_title IS NULL;

UPDATE contacts SET job_title = 'Account Executive' 
WHERE email = 'david.wilson@admortgage.com' AND job_title IS NULL;

UPDATE contacts SET job_title = 'Account Executive - DSCR' 
WHERE email = 'christina.fairbanks@acralending.com' AND job_title IS NULL;

-- Update lenders with Account Executive info
-- Harvest Small Business Finance - Amy Perrella
UPDATE lenders 
SET account_executive = 'Amy Perrella',
    account_executive_email = 'aperrella@harvestcref.com'
WHERE lender_name ILIKE '%Harvest%' AND (account_executive IS NULL OR account_executive = '');

-- Valere Financial - check for existing sender info
UPDATE lenders 
SET account_executive = 'Sales Team',
    account_executive_email = 'sales@valerefinancial.com'
WHERE lender_name ILIKE '%Valere%' AND (account_executive IS NULL OR account_executive = '');

-- LoanStream Mortgage - update if no AE
UPDATE lenders 
SET account_executive = 'Account Team'
WHERE lender_name ILIKE '%LoanStream%' AND (account_executive IS NULL OR account_executive = '');

-- ACC Mortgage / AAA Lendings
UPDATE lenders 
SET account_executive = 'Susan'
WHERE lender_name ILIKE '%ACC%' OR lender_name ILIKE '%AAA%' AND (account_executive IS NULL OR account_executive = '');