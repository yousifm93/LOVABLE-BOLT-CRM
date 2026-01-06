-- Insert Developer agent for new construction/developer deals
INSERT INTO buyer_agents (first_name, last_name, brokerage, notes)
VALUES ('Developer', '- New Construction', 'Developer', 'Use for new construction or developer transactions')
ON CONFLICT DO NOTHING;

-- Insert ReFi agent for refinance transactions
INSERT INTO buyer_agents (first_name, last_name, brokerage, notes)
VALUES ('ReFi', '- Refinance', 'ReFi', 'Use for refinance transactions')
ON CONFLICT DO NOTHING;