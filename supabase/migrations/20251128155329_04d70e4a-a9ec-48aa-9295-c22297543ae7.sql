-- Sync pipeline_views column_order to match actual page MAIN_VIEW_COLUMNS
-- Use exact accessorKey IDs from each page

-- Leads: name, createdOn, realEstateAgent, status, user, dueDate, notes
UPDATE pipeline_views 
SET column_order = '["name", "createdOn", "realEstateAgent", "status", "user", "dueDate", "notes"]'::jsonb
WHERE pipeline_type = 'leads' AND name = 'Main View';

-- PendingApp: name, pendingAppOn, status, realEstateAgent, user, dueDate, latestFileUpdates  
UPDATE pipeline_views 
SET column_order = '["name", "pendingAppOn", "status", "realEstateAgent", "user", "dueDate", "latestFileUpdates"]'::jsonb
WHERE pipeline_type = 'pending_app' AND name = 'Main View';

-- Screening: name, appCompleteOn, loanNumber, status, realEstateAgent, user, dueDate, loanAmount, salesPrice, ltv
UPDATE pipeline_views 
SET column_order = '["name", "appCompleteOn", "loanNumber", "status", "realEstateAgent", "user", "dueDate", "loanAmount", "salesPrice", "ltv"]'::jsonb
WHERE pipeline_type = 'screening' AND name = 'Main View';

-- PreQualified: name, preQualifiedOn, realEstateAgent, status, loanNumber, loanAmount, salesPrice, ltv, dti, user, dueDate, baStatus
UPDATE pipeline_views 
SET column_order = '["name", "preQualifiedOn", "realEstateAgent", "status", "loanNumber", "loanAmount", "salesPrice", "ltv", "dti", "user", "dueDate", "baStatus"]'::jsonb
WHERE pipeline_type = 'pre_qualified' AND name = 'Main View';

-- PreApproved: name, preApprovedOn, loanNumber, user, status, realEstateAgent, baStatus, dueDate, loanAmount, salesPrice, ltv, dti
UPDATE pipeline_views 
SET column_order = '["name", "preApprovedOn", "loanNumber", "user", "status", "realEstateAgent", "baStatus", "dueDate", "loanAmount", "salesPrice", "ltv", "dti"]'::jsonb
WHERE pipeline_type = 'pre_approved' AND name = 'Main View';

-- Active: borrower_name, team, lender, arrive_loan_number, loan_amount, disclosure_status, close_date, loan_status, appraisal_status, title_status, hoi_status, condo_status, cd_status, package_status, lock_expiration_date, ba_status, epo_status, buyer_agent, listing_agent
UPDATE pipeline_views 
SET column_order = '["borrower_name", "team", "lender", "arrive_loan_number", "loan_amount", "disclosure_status", "close_date", "loan_status", "appraisal_status", "title_status", "hoi_status", "condo_status", "cd_status", "package_status", "lock_expiration_date", "ba_status", "epo_status", "buyer_agent", "listing_agent"]'::jsonb
WHERE pipeline_type = 'active' AND name = 'Main View';

-- PastClients: borrower_name, team, lender, arrive_loan_number, loan_amount, sales_price, close_date, closed_at, loan_status, appraisal_status, title_status, hoi_status, condo_status, cd_status, disclosure_status, package_status, ba_status, real_estate_agent, listing_agent
UPDATE pipeline_views 
SET column_order = '["borrower_name", "team", "lender", "arrive_loan_number", "loan_amount", "sales_price", "close_date", "closed_at", "loan_status", "appraisal_status", "title_status", "hoi_status", "condo_status", "cd_status", "disclosure_status", "package_status", "ba_status", "real_estate_agent", "listing_agent"]'::jsonb
WHERE pipeline_type = 'past_clients' AND name = 'Main View';

-- Delete any duplicate Main View entries (keep only one per pipeline)
DELETE FROM pipeline_views a
USING pipeline_views b
WHERE a.id < b.id 
  AND a.pipeline_type = b.pipeline_type 
  AND a.name = 'Main View' 
  AND b.name = 'Main View';