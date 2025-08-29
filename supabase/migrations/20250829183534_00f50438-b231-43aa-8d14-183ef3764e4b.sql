-- Add sample data for active loans with correct enum values
INSERT INTO leads (
  first_name, last_name, email, phone, loan_amount, status, pipeline_section,
  teammate_assigned, created_by, account_id, lead_on_date, arrive_loan_number,
  pr_type, disclosure_status, loan_status, appraisal_status, title_status
) VALUES 
-- Incoming loans
('Sarah', 'Johnson', 'sarah.j@email.com', '(555) 123-4567', 450000, 'Working on it', 'Incoming', 
 (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT account_id FROM profiles LIMIT 1), 
 CURRENT_DATE, 100234, 'P', 'Sent', 'RFP', 'Ordered', 'Requested'),
('Michael', 'Davis', 'michael.d@email.com', '(555) 234-5678', 650000, 'Working on it', 'Incoming',
 (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT account_id FROM profiles LIMIT 1),
 CURRENT_DATE, 100235, 'R', 'Signed', 'CTC', 'Received', 'Received'),
('Emma', 'Wilson', 'emma.w@email.com', '(555) 345-6789', 320000, 'Working on it', 'Incoming',
 (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT account_id FROM profiles LIMIT 1),
 CURRENT_DATE, 100236, 'P', 'Ordered', 'SUV', 'Scheduled', 'Requested'),

-- On Hold loans  
('David', 'Brown', 'david.b@email.com', '(555) 456-7890', 550000, 'On Hold', 'On Hold',
 (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT account_id FROM profiles LIMIT 1),
 CURRENT_DATE, 100237, 'R', 'Sent', 'AWC', 'Inspected', 'Received'),
('Lisa', 'Martinez', 'lisa.m@email.com', '(555) 567-8901', 425000, 'On Hold', 'On Hold',
 (SELECT id FROM users LIMIT 1), (SELECT id FROM users LIMIT 1), (SELECT account_id FROM profiles LIMIT 1),
 CURRENT_DATE, 100238, 'HELOC', 'Need Signature', 'NEW', 'Waiver', 'Requested');