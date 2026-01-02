-- Insert N/A agent for refinance transactions
INSERT INTO buyer_agents (first_name, last_name, brokerage, notes)
VALUES ('N/A', '- Not Applicable', 'N/A', 'Use for refinance transactions or deals with no agent')
ON CONFLICT DO NOTHING;