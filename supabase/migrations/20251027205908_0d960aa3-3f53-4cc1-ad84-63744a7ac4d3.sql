-- Step 1: Temporarily remove all buyer_agent_ids that don't exist in buyer_agents
UPDATE leads
SET buyer_agent_id = NULL
WHERE buyer_agent_id IS NOT NULL
  AND buyer_agent_id NOT IN (SELECT id FROM buyer_agents);

-- Step 2: Drop old foreign key constraint
ALTER TABLE leads 
DROP CONSTRAINT IF EXISTS leads_buyer_agent_id_fkey;

-- Step 3: Add new foreign key constraint pointing to buyer_agents
ALTER TABLE leads
ADD CONSTRAINT leads_buyer_agent_id_fkey 
FOREIGN KEY (buyer_agent_id) 
REFERENCES buyer_agents(id) 
ON DELETE SET NULL;

-- Step 4: Copy missing agents from contacts to buyer_agents (preserving IDs where possible)
INSERT INTO buyer_agents (id, first_name, last_name, email, phone, brokerage, created_at, updated_at)
SELECT 
  gen_random_uuid() as id,  -- Generate new IDs for buyer_agents
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.company as brokerage,
  c.created_at,
  c.updated_at
FROM contacts c
WHERE c.type = 'Agent'
  AND NOT EXISTS (
    SELECT 1 FROM buyer_agents ba 
    WHERE LOWER(ba.first_name) = LOWER(c.first_name) 
    AND LOWER(ba.last_name) = LOWER(c.last_name)
  )
ON CONFLICT DO NOTHING;