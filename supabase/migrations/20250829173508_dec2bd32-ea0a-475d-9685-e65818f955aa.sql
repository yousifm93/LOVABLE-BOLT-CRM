-- Insert sample active borrowers with pipeline data
INSERT INTO public.leads (
  first_name, last_name, email, phone, loan_amount, loan_type, property_type, occupancy,
  arrive_loan_number, pr_type, disclosure_status, close_date, loan_status, 
  appraisal_status, title_status, hoi_status, condo_status, cd_status, 
  package_status, lock_expiration_date, ba_status, epo_status,
  lead_on_date, status, lead_strength, notes
) VALUES 
(
  'Sarah', 'Johnson', 'sarah.johnson@email.com', '(555) 123-4567', 
  650000, 'Purchase', 'Single Family', 'Primary Residence',
  1001, 'P', 'Signed', '2024-03-15', 'AWC',
  'Received', 'Received', 'Received', NULL, 'Sent',
  'Final', '2024-03-10', 'Signed', 'Signed',
  CURRENT_DATE - INTERVAL '45 days', 'Working on it', 'Hot',
  'First-time homebuyer, pre-approved for $700k'
),
(
  'Michael', 'Chen', 'michael.chen@email.com', '(555) 234-5678',
  450000, 'Refinance', 'Townhouse', 'Primary Residence', 
  1002, 'R', 'Sent', '2024-02-28', 'CTC',
  'Waiver', 'Requested', 'Ordered', NULL, 'Signed',
  'Final', '2024-02-25', 'Sent', 'Sent',
  CURRENT_DATE - INTERVAL '30 days', 'Working on it', 'Warm',
  'Cash-out refinance, excellent credit score'
),
(
  'Jennifer', 'Martinez', 'jennifer.martinez@email.com', '(555) 345-6789',
  825000, 'Purchase', 'Condo', 'Primary Residence',
  1003, 'P', 'Ordered', '2024-04-20', 'SUV', 
  'Scheduled', 'Requested', 'Quoted', 'Ordered', 'Requested',
  'Initial', '2024-04-15', 'Send', 'Send',
  CURRENT_DATE - INTERVAL '20 days', 'Working on it', 'Hot',
  'Moving from out of state, needs quick closing'
),
(
  'David', 'Wilson', 'david.wilson@email.com', '(555) 456-7890',
  380000, 'Purchase', 'Single Family', 'Investment Property',
  1004, 'P', 'Need Signature', '2024-03-30', 'RFP',
  'Ordered', 'Requested', 'Ordered', NULL, 'Requested', 
  'Initial', '2024-03-25', 'Send', 'Send',
  CURRENT_DATE - INTERVAL '25 days', 'Working on it', 'Warm',
  'Investment property purchase, experienced investor'
),
(
  'Lisa', 'Thompson', 'lisa.thompson@email.com', '(555) 567-8901',
  1200000, 'Purchase', 'Single Family', 'Primary Residence',
  1005, 'HELOC', 'Signed', '2024-05-10', 'NEW',
  'Inspected', 'Received', 'Received', 'Received', 'Sent',
  'Final', '2024-05-05', 'Signed', 'Signed', 
  CURRENT_DATE - INTERVAL '10 days', 'Working on it', 'Hot',
  'Luxury home purchase, bridge loan needed'
);