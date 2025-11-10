
begin;

-- Step 1: Delete tasks tied to Pending App leads
DELETE FROM tasks
WHERE borrower_id IN (
  SELECT id FROM leads
  WHERE pipeline_stage_id = '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945'
);

-- Step 2: Delete all current Pending App leads
DELETE FROM leads
WHERE pipeline_stage_id = '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945';

-- Step 3: Create 5 new buyer agents
INSERT INTO buyer_agents (first_name, last_name, brokerage)
SELECT * FROM (
  VALUES 
    ('Evan','Schechtman','Unknown'),
    ('Livia','Ballou','Unknown'),
    ('Aura','Caruso','Unknown'),
    ('Raul','Alvarez','Unknown'),
    ('David','Freed','Unknown')
) AS v(first_name,last_name,brokerage)
WHERE NOT EXISTS (
  SELECT 1 FROM buyer_agents b
  WHERE b.first_name = v.first_name AND b.last_name = v.last_name
);

-- Step 4: Insert 16 new Pending App leads
WITH defaults AS (
  SELECT created_by, account_id
  FROM leads
  ORDER BY created_at DESC
  LIMIT 1
),
agent_ids AS (
  SELECT first_name, last_name, id
  FROM buyer_agents
  WHERE (first_name, last_name) IN (
    ('Evan','Schechtman'),('Livia','Ballou'),('Aura','Caruso'),('Raul','Alvarez'),('David','Freed')
  )
)
INSERT INTO leads (
  first_name,last_name,lead_on_date,pending_app_at,phone,email,buyer_agent_id,task_eta,pipeline_stage_id,account_id,created_by
)
SELECT s.first_name, s.last_name, s.lead_on_date, s.pending_app_at, s.phone, s.email, s.buyer_agent_id,
       s.task_eta, '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945'::uuid, d.account_id, d.created_by
FROM (
  SELECT 'Ed' AS first_name, 'McNally' AS last_name, DATE '2024-07-28' AS lead_on_date, TIMESTAMP '2024-08-04' AS pending_app_at,
         '075 557 35870' AS phone, 'edwardmcnally@leadenhallawgroup.co.uk' AS email,
         (SELECT id FROM agent_ids WHERE first_name='Evan' AND last_name='Schechtman') AS buyer_agent_id,
         DATE '2024-10-17' AS task_eta
  UNION ALL
  SELECT 'Carlos','Souza', DATE '2024-08-13', TIMESTAMP '2024-08-13', NULL, NULL, NULL, DATE '2024-10-31'
  UNION ALL
  SELECT 'Abdolhamid','Zandi', DATE '2024-08-25', TIMESTAMP '2024-08-25',
         '+1 954 214 4444', 'hamidzandi@earthlink.net', NULL, DATE '2024-10-20'
  UNION ALL
  SELECT 'Evan','Schechtman', DATE '2024-08-05', TIMESTAMP '2024-08-27',
         '+1 786 755 3669', 'evan@blackbookproperties.com', NULL, DATE '2024-10-31'
  UNION ALL
  SELECT 'Mario','Russo', DATE '2024-08-11', TIMESTAMP '2024-09-02',
         '+1 305 610 6815', NULL,
         (SELECT id FROM agent_ids WHERE first_name='Livia' AND last_name='Ballou'), DATE '2024-10-23'
  UNION ALL
  SELECT 'Rita','Pollina', DATE '2024-08-20', TIMESTAMP '2024-09-03',
         '+1 786 717 2310', NULL, NULL, DATE '2024-10-17'
  UNION ALL
  SELECT 'Wanderley','Ferreira', DATE '2024-09-02', TIMESTAMP '2024-09-04',
         '+1 321 634 4538', 'wanderleycamilofiversunds@gmail.com',
         (SELECT id FROM agent_ids WHERE first_name='Aura' AND last_name='Caruso'), DATE '2024-10-23'
  UNION ALL
  SELECT 'Ohad','E', DATE '2024-10-07', TIMESTAMP '2024-10-09', NULL, NULL, NULL, DATE '2024-10-20'
  UNION ALL
  SELECT 'Sadek','Egyptian', DATE '2024-08-29', TIMESTAMP '2024-10-09', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='Raul' AND last_name='Alvarez'), DATE '2024-10-23'
  UNION ALL
  SELECT 'Tony','Bell', DATE '2024-09-25', TIMESTAMP '2024-10-10', NULL, NULL, NULL, DATE '2024-10-17'
  UNION ALL
  SELECT 'Mahesh','', DATE '2024-10-24', TIMESTAMP '2024-10-24', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='David' AND last_name='Freed'), DATE '2024-10-24'
  UNION ALL
  SELECT 'Mehdi','Whatsapp', DATE '2024-10-14', TIMESTAMP '2024-10-27', NULL, NULL, NULL, DATE '2024-10-21'
  UNION ALL
  SELECT 'Carlos','Gallardo', DATE '2024-11-04', TIMESTAMP '2024-11-06',
         '+1 786 523 8137', 'crg@innovadg.com', NULL, DATE '2024-11-12'
  UNION ALL
  SELECT 'Anton','', DATE '2024-10-31', TIMESTAMP '2024-11-06', NULL, NULL, NULL, DATE '2024-11-12'
  UNION ALL
  SELECT 'Sang','Kim', DATE '2024-11-10', TIMESTAMP '2024-11-10', NULL, NULL, NULL, DATE '2024-11-10'
  UNION ALL
  SELECT 'Antje','Construction', DATE '2024-11-01', TIMESTAMP '2024-11-10',
         '+1 305 710 6534', NULL, NULL, DATE '2024-11-28'
) AS s(first_name,last_name,lead_on_date,pending_app_at,phone,email,buyer_agent_id,task_eta), defaults d;

commit;
