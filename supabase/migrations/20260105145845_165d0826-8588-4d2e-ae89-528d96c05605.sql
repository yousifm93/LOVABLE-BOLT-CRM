-- Add Idle pipeline stage after Past Clients
INSERT INTO pipeline_stages (id, name, is_active, order_index, created_at)
VALUES (gen_random_uuid(), 'Idle', true, 8, now());