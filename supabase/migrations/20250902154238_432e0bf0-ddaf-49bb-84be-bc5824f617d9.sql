-- Insert sample audit log entries for testing dashboard components
INSERT INTO audit_log (table_name, action, category, item_id, changed_by, changed_at, before_data, after_data) VALUES
-- Today's activities
('leads', 'insert', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '2 hours', null, '{"first_name": "John", "last_name": "Smith", "status": "Working on it"}'),
('leads', 'update', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '1 hour', '{"status": "Working on it"}', '{"status": "Dead"}'),
('contacts', 'insert', 'contacts', gen_random_uuid(), gen_random_uuid(), now() - interval '3 hours', null, '{"first_name": "Sarah", "last_name": "Johnson", "type": "agent"}'),
('tasks', 'insert', 'tasks', gen_random_uuid(), gen_random_uuid(), now() - interval '30 minutes', null, '{"title": "Follow up call", "status": "To Do"}'),
('tasks', 'update', 'tasks', gen_random_uuid(), gen_random_uuid(), now() - interval '15 minutes', '{"status": "To Do"}', '{"status": "In Progress"}'),

-- Yesterday's activities  
('leads', 'insert', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '1 day 3 hours', null, '{"first_name": "Mike", "last_name": "Davis", "status": "Working on it"}'),
('leads', 'update', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '1 day 2 hours', '{"status": "Working on it"}', '{"status": "Converted"}'),
('contacts', 'insert', 'contacts', gen_random_uuid(), gen_random_uuid(), now() - interval '1 day 1 hour', null, '{"first_name": "Lisa", "last_name": "Wilson", "type": "lender"}'),
('tasks', 'delete', 'tasks', gen_random_uuid(), gen_random_uuid(), now() - interval '1 day 30 minutes', '{"title": "Old task", "status": "Done"}', null),

-- Last week's activities
('leads', 'insert', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '3 days', null, '{"first_name": "Robert", "last_name": "Brown", "status": "Working on it"}'),
('leads', 'update', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '4 days', '{"status": "Working on it"}', '{"status": "Nurture"}'),
('contacts', 'update', 'contacts', gen_random_uuid(), gen_random_uuid(), now() - interval '5 days', '{"phone": "555-0123"}', '{"phone": "555-0124"}'),
('tasks', 'insert', 'tasks', gen_random_uuid(), gen_random_uuid(), now() - interval '6 days', null, '{"title": "Review documents", "status": "To Do"}'),
('leads', 'delete', 'pipeline', gen_random_uuid(), gen_random_uuid(), now() - interval '7 days', '{"first_name": "Test", "last_name": "Lead", "status": "Dead"}', null);

-- Insert sample leads for conversion analytics (need a real account_id)
DO $$
DECLARE
    sample_account_id uuid;
    sample_user_id uuid;
BEGIN
    -- Get or create a sample account and user
    INSERT INTO profiles (user_id, account_id, first_name, last_name) 
    VALUES (gen_random_uuid(), gen_random_uuid(), 'Sample', 'User') 
    RETURNING account_id, user_id INTO sample_account_id, sample_user_id;

    -- Insert sample leads with various statuses and stages for conversion testing
    INSERT INTO leads (account_id, created_by, first_name, last_name, status, lead_on_date, email, phone) VALUES
    -- Today's leads
    (sample_account_id, sample_user_id, 'Alice', 'Johnson', 'Working on it', CURRENT_DATE, 'alice@email.com', '555-0101'),
    (sample_account_id, sample_user_id, 'Bob', 'Smith', 'Converted', CURRENT_DATE, 'bob@email.com', '555-0102'),
    (sample_account_id, sample_user_id, 'Carol', 'Davis', 'Nurture', CURRENT_DATE, 'carol@email.com', '555-0103'),
    (sample_account_id, sample_user_id, 'David', 'Wilson', 'Dead', CURRENT_DATE, 'david@email.com', '555-0104'),
    
    -- Yesterday's leads
    (sample_account_id, sample_user_id, 'Eve', 'Brown', 'Converted', CURRENT_DATE - 1, 'eve@email.com', '555-0105'),
    (sample_account_id, sample_user_id, 'Frank', 'Taylor', 'Working on it', CURRENT_DATE - 1, 'frank@email.com', '555-0106'),
    (sample_account_id, sample_user_id, 'Grace', 'Anderson', 'Nurture', CURRENT_DATE - 1, 'grace@email.com', '555-0107'),
    (sample_account_id, sample_user_id, 'Henry', 'Thomas', 'Dead', CURRENT_DATE - 1, 'henry@email.com', '555-0108'),
    
    -- Last week's leads
    (sample_account_id, sample_user_id, 'Ivy', 'Jackson', 'Converted', CURRENT_DATE - 3, 'ivy@email.com', '555-0109'),
    (sample_account_id, sample_user_id, 'Jack', 'White', 'Working on it', CURRENT_DATE - 4, 'jack@email.com', '555-0110'),
    (sample_account_id, sample_user_id, 'Kate', 'Harris', 'Nurture', CURRENT_DATE - 5, 'kate@email.com', '555-0111'),
    (sample_account_id, sample_user_id, 'Liam', 'Martin', 'Dead', CURRENT_DATE - 6, 'liam@email.com', '555-0112'),
    (sample_account_id, sample_user_id, 'Mia', 'Garcia', 'Converted', CURRENT_DATE - 7, 'mia@email.com', '555-0113');
END $$;