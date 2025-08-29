-- Add sample condo data
INSERT INTO condos (
  condo_name, street_address, city, state, zip, area,
  approval_source, approval_type, approval_expiration_date,
  mip_file_url, cq_file_url, budget_file_url
) VALUES 
('Oceanview Towers', '123 Ocean Drive', 'Miami', 'FL', '33101', 'South Beach',
 'FHA', 'Full', '2025-12-31', NULL, NULL, NULL),
('Downtown Lofts', '456 Main Street', 'Seattle', 'WA', '98101', 'Downtown',
 'VA', 'Limited', '2025-06-30', NULL, NULL, NULL),
('Riverside Commons', '789 River Road', 'Portland', 'OR', '97201', 'Pearl District', 
 'Conventional', 'Full', '2026-03-15', NULL, NULL, NULL),
('Sunset Heights', '321 Sunset Blvd', 'Los Angeles', 'CA', '90210', 'Beverly Hills',
 'FHA', 'Non-QM', '2025-09-20', NULL, NULL, NULL),
('Harbor View', '654 Harbor Street', 'San Francisco', 'CA', '94105', 'SOMA',
 'Conventional', 'Full', '2025-11-10', NULL, NULL, NULL),
('City Center Plaza', '987 Center Ave', 'Chicago', 'IL', '60601', 'The Loop',
 'VA', 'Limited', '2025-08-25', NULL, NULL, NULL),
('Mountain Ridge', '147 Mountain View Dr', 'Denver', 'CO', '80202', 'Capitol Hill',
 'FHA', 'Hard Money', '2025-07-18', NULL, NULL, NULL),
('Lakefront Towers', '258 Lake Shore Dr', 'Austin', 'TX', '73301', 'Downtown',
 'Conventional', 'Full', '2026-01-05', NULL, NULL, NULL),
('Garden District', '369 Garden St', 'New Orleans', 'LA', '70112', 'French Quarter',
 'FHA', 'Limited', '2025-10-12', NULL, NULL, NULL),
('Metro Heights', '741 Metro Blvd', 'Atlanta', 'GA', '30309', 'Midtown',
 'VA', 'Full', '2025-12-08', NULL, NULL, NULL);