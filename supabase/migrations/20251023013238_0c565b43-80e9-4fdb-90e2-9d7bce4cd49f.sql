
-- Populate active pipeline with varied test data
WITH active_leads AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM leads 
  WHERE pipeline_section = 'Live'
),
test_data AS (
  SELECT 
    id,
    1000000 + (rn * 12345) % 900000 as loan_num,
    CASE (rn % 9)
      WHEN 0 THEN '2025-10-05'
      WHEN 1 THEN '2025-10-08'
      WHEN 2 THEN '2025-10-12'
      WHEN 3 THEN '2025-10-15'
      WHEN 4 THEN '2025-10-18'
      WHEN 5 THEN '2025-10-22'
      WHEN 6 THEN '2025-10-25'
      WHEN 7 THEN '2025-10-28'
      ELSE '2025-10-31'
    END as lock_date,
    CASE (rn % 5)
      WHEN 0 THEN 'NEW'
      WHEN 1 THEN 'RFP'
      WHEN 2 THEN 'SUV'
      WHEN 3 THEN 'AWC'
      ELSE 'CTC'
    END as loan_st,
    CASE (rn % 5)
      WHEN 0 THEN 'Ordered'
      WHEN 1 THEN 'Scheduled'
      WHEN 2 THEN 'Inspected'
      WHEN 3 THEN 'Received'
      ELSE 'Waiver'
    END as appr_st,
    CASE (rn % 2) WHEN 0 THEN 'Requested' ELSE 'Received' END as title_st,
    CASE (rn % 3) WHEN 0 THEN 'Quoted' WHEN 1 THEN 'Ordered' ELSE 'Received' END as hoi_st,
    CASE (rn % 3) WHEN 0 THEN 'Ordered' WHEN 1 THEN 'Received' ELSE 'Approved' END as condo_st,
    CASE (rn % 3) WHEN 0 THEN 'Requested' WHEN 1 THEN 'Sent' ELSE 'Signed' END as cd_st,
    CASE (rn % 2) WHEN 0 THEN 'Initial' ELSE 'Final' END as pkg_st,
    CASE (rn % 3) WHEN 0 THEN 'Send' WHEN 1 THEN 'Sent' ELSE 'Signed' END as ba_st,
    CASE (rn % 3) WHEN 0 THEN 'Send' WHEN 1 THEN 'Sent' ELSE 'Signed' END as epo_st
  FROM active_leads
)
UPDATE leads 
SET 
  arrive_loan_number = test_data.loan_num,
  lock_expiration_date = test_data.lock_date::date,
  loan_status = test_data.loan_st::loan_status,
  appraisal_status = test_data.appr_st::appraisal_status,
  title_status = test_data.title_st::title_status,
  hoi_status = test_data.hoi_st::hoi_status,
  condo_status = test_data.condo_st::condo_status,
  cd_status = test_data.cd_st::cd_status,
  package_status = test_data.pkg_st::package_status,
  ba_status = test_data.ba_st::ba_status,
  epo_status = test_data.epo_st::epo_status
FROM test_data
WHERE leads.id = test_data.id;
