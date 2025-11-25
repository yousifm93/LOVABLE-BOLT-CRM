-- Phase 2: Update existing leads close dates and loan statuses

-- Close Date Updates
UPDATE leads SET close_date = '2025-11-28' WHERE id = 'cd14244c-d1bb-4b40-afcc-fb9c5a520e19'; -- Diana Alzate
UPDATE leads SET close_date = '2025-11-28' WHERE id = '72f0663a-ef9e-4c41-834a-2fa37aaf20f6'; -- Jackeline Londono
UPDATE leads SET close_date = '2025-11-28' WHERE id = '4a7e6f1e-f235-45f4-9069-883d5e9a0525'; -- Yoseph Cetton
UPDATE leads SET close_date = '2025-11-26' WHERE id = '1439b165-8ed9-439c-b09b-e022303e413f'; -- Geetha Samkuratri
UPDATE leads SET close_date = '2025-11-26' WHERE id = '6bb10ab3-4d10-418d-9cd0-a920ea3a882d'; -- Eunice Giraldo
UPDATE leads SET close_date = '2025-12-15' WHERE id = '3baf56ce-8b87-4d61-82f3-30da8a0d595a'; -- Dario Occelli
UPDATE leads SET close_date = '2025-12-15' WHERE id = '2c73e707-f765-400c-8cc0-3b5075170f00'; -- Rayza Occelli
UPDATE leads SET close_date = '2025-12-12' WHERE id = 'df4e155b-52d8-4ae4-a36a-4831d189c263'; -- Daniel Faltas
UPDATE leads SET close_date = '2025-12-12' WHERE id = 'f4a85815-4e2a-44b3-b21b-367145e604f8'; -- Rahul Kommineni
UPDATE leads SET close_date = '2026-01-01' WHERE id = '07afa406-106c-4369-a049-8dc1d2a19853'; -- Alejandro Rasic

-- Loan Status Updates (only for statuses that exist: AWC, RFP, CTC)
UPDATE leads SET loan_status = 'CTC' WHERE id = '72f0663a-ef9e-4c41-834a-2fa37aaf20f6'; -- Jackeline Londono
UPDATE leads SET loan_status = 'CTC' WHERE id = '4a7e6f1e-f235-45f4-9069-883d5e9a0525'; -- Yoseph Cetton
UPDATE leads SET loan_status = 'CTC' WHERE id = '1439b165-8ed9-439c-b09b-e022303e413f'; -- Geetha Samkuratri
UPDATE leads SET loan_status = 'AWC' WHERE id = '6bb10ab3-4d10-418d-9cd0-a920ea3a882d'; -- Eunice Giraldo
UPDATE leads SET loan_status = 'AWC' WHERE id = '8a0eed48-b877-4b25-87e8-f13ab8c263fa'; -- Myles Munroe
UPDATE leads SET loan_status = 'AWC' WHERE id = '07afa406-106c-4369-a049-8dc1d2a19853'; -- Alejandro Rasic
UPDATE leads SET loan_status = 'AWC' WHERE id = 'e6ab6ded-9b3b-4cc5-997a-732471c4ccab'; -- Sundeep Sayapneni