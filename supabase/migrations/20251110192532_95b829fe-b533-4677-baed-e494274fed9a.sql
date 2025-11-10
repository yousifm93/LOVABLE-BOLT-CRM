begin;

-- 0) Delete tasks tied to leads in the "Leads" stage
DELETE FROM tasks
WHERE borrower_id IN (
  SELECT id FROM leads
  WHERE pipeline_stage_id = (SELECT id FROM pipeline_stages WHERE name='Leads' LIMIT 1)
);

-- 1) Delete all leads in the "Leads" stage
DELETE FROM leads
WHERE pipeline_stage_id = (SELECT id FROM pipeline_stages WHERE name='Leads' LIMIT 1);

-- 2) Ensure required buyer_agents (with required brokerage field)
INSERT INTO buyer_agents (first_name, last_name, brokerage)
SELECT * FROM (
  VALUES 
    ('Weston','Lyons','Unknown'),
    ('Sebastian','Acosta','Unknown'),
    ('Julian','Acosta','Unknown'),
    ('Jonathan','Cedeno','Unknown'),
    ('Angel','Cuan','Unknown'),
    ('Ambar','Payan','Unknown'),
    ('Sonja','Cajuste','Unknown'),
    ('Rodrigo','Povoa','Unknown'),
    ('Elisa','Da Silva','Unknown')
) AS v(first_name,last_name,brokerage)
WHERE NOT EXISTS (
  SELECT 1 FROM buyer_agents b
  WHERE b.first_name = v.first_name AND b.last_name = v.last_name
);

-- 3) Insert 13 new leads
WITH defaults AS (
  SELECT created_by, account_id
  FROM leads
  ORDER BY created_at DESC
  LIMIT 1
),
leads_stage AS (
  SELECT id FROM pipeline_stages WHERE name = 'Leads' LIMIT 1
),
agent_ids AS (
  SELECT first_name, last_name, id
  FROM buyer_agents
  WHERE (first_name, last_name) IN (
    ('Weston','Lyons'),('Sebastian','Acosta'),('Julian','Acosta'),('Jonathan','Cedeno'),
    ('Angel','Cuan'),('Ambar','Payan'),('Sonja','Cajuste'),('Rodrigo','Povoa'),('Elisa','Da Silva')
  )
)
INSERT INTO leads (
  first_name,last_name,lead_on_date,phone,email,buyer_agent_id,task_eta,pipeline_stage_id,account_id,created_by
)
SELECT s.first_name, s.last_name, s.lead_on_date, s.phone, s.email, s.buyer_agent_id,
       s.task_eta, (SELECT id FROM leads_stage), d.account_id, d.created_by
FROM (
  SELECT 'Costa' AS first_name, 'Brava' AS last_name, DATE '2025-11-10' AS lead_on_date, NULL::text AS phone, NULL::text AS email, 
         (SELECT id FROM agent_ids WHERE first_name='Weston' AND last_name='Lyons') AS buyer_agent_id,
         DATE '2025-11-10' AS task_eta
  UNION ALL
  SELECT 'Sebastian','CABB', DATE '2025-11-10', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='Sebastian' AND last_name='Acosta'), DATE '2025-11-10'
  UNION ALL
  SELECT 'Beth','Simonton Refl', DATE '2025-11-10', NULL, NULL, NULL, DATE '2025-11-12'
  UNION ALL
  SELECT 'Gravine','', DATE '2025-11-07', '+1 305 926 3845', NULL,
         (SELECT id FROM agent_ids WHERE first_name='Julian' AND last_name='Acosta'), DATE '2025-11-10'
  UNION ALL
  SELECT 'Tatiana','Paul', DATE '2025-11-06', '+1 786 366 8715', 'Tpaul005@gmail.com',
         (SELECT id FROM agent_ids WHERE first_name='Jonathan' AND last_name='Cedeno'), DATE '2025-11-12'
  UNION ALL
  SELECT 'Kevin','', DATE '2025-11-06', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='Angel' AND last_name='Cuan'), DATE '2025-12-04'
  UNION ALL
  SELECT 'Jennifer','West', DATE '2025-11-05', NULL, NULL, NULL, DATE '2025-11-05'
  UNION ALL
  SELECT 'Amir','', DATE '2025-11-04', '+1 613 621 3959', NULL,
         (SELECT id FROM agent_ids WHERE first_name='Ambar' AND last_name='Payan'), DATE '2025-11-04'
  UNION ALL
  SELECT 'Pascal','Valez', DATE '2025-11-04', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='Sonja' AND last_name='Cajuste'), DATE '2025-11-11'
  UNION ALL
  SELECT 'Zach','Veila', DATE '2025-11-04', NULL, NULL, NULL, DATE '2025-11-04'
  UNION ALL
  SELECT 'Rodrigo','Neo Vertika', DATE '2025-11-04', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='Rodrigo' AND last_name='Povoa'), DATE '2025-11-05'
  UNION ALL
  SELECT 'Adriana - Yousra Coworker','', DATE '2025-11-03', NULL, NULL, NULL, DATE '2025-11-24'
  UNION ALL
  SELECT 'Roney Palace/ trust 1','', DATE '2025-11-03', NULL, NULL,
         (SELECT id FROM agent_ids WHERE first_name='Elisa' AND last_name='Da Silva'), DATE '2025-11-10'
) AS s(first_name,last_name,lead_on_date,phone,email,buyer_agent_id,task_eta), defaults d;

commit;