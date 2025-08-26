-- Insert the authenticated user into the users table
INSERT INTO public.users (id, email, first_name, last_name, role) 
VALUES ('31e7f1ae-8021-4214-841e-c7d440789fe3', 'yousif@visionarycapitaltx.com', 'Yousif', 'Mohamed', 'LO')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tasks with proper user assignments
INSERT INTO public.tasks (title, description, priority, status, assignee_id, created_by, due_date, task_order) VALUES
('Review loan application for Smith family', 'Complete initial review of documentation and verify income requirements', 'High', 'To Do', '31e7f1ae-8021-4214-841e-c7d440789fe3', '31e7f1ae-8021-4214-841e-c7d440789fe3', CURRENT_DATE + INTERVAL '2 days', 1),
('Schedule property appraisal', 'Coordinate with appraiser for 123 Main St property evaluation', 'Medium', 'In Progress', '31e7f1ae-8021-4214-841e-c7d440789fe3', '31e7f1ae-8021-4214-841e-c7d440789fe3', CURRENT_DATE + INTERVAL '5 days', 2),
('Prepare closing documents', 'Generate all necessary paperwork for Johnson closing next week', 'High', 'To Do', '31e7f1ae-8021-4214-841e-c7d440789fe3', '31e7f1ae-8021-4214-841e-c7d440789fe3', CURRENT_DATE + INTERVAL '7 days', 3),
('Follow up on credit report discrepancies', 'Contact borrower about resolving credit issues identified in underwriting', 'Medium', 'To Do', '31e7f1ae-8021-4214-841e-c7d440789fe3', '31e7f1ae-8021-4214-841e-c7d440789fe3', CURRENT_DATE + INTERVAL '3 days', 4),
('Update CRM with client communication log', 'Document all recent communications with active borrowers in system', 'Low', 'Done', '31e7f1ae-8021-4214-841e-c7d440789fe3', '31e7f1ae-8021-4214-841e-c7d440789fe3', CURRENT_DATE - INTERVAL '1 day', 5);