-- Clean up orphaned buyer agent references
UPDATE leads 
SET buyer_agent_id = NULL 
WHERE buyer_agent_id IS NOT NULL 
  AND buyer_agent_id NOT IN (SELECT id FROM buyer_agents);

-- Add foreign key from leads.teammate_assigned to users.id
ALTER TABLE leads 
ADD CONSTRAINT fk_leads_teammate_assigned 
FOREIGN KEY (teammate_assigned) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Add foreign key from leads.buyer_agent_id to buyer_agents.id  
ALTER TABLE leads 
ADD CONSTRAINT fk_leads_buyer_agent_id 
FOREIGN KEY (buyer_agent_id) 
REFERENCES buyer_agents(id) 
ON DELETE SET NULL;