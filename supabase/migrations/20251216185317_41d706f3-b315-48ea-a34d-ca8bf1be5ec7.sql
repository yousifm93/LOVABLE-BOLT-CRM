-- Delete duplicate conditions for Cullen Mahoney lead, keeping one of each
DELETE FROM lead_conditions
WHERE id IN (
  '11dceb79-1f7b-4b35-ab23-c1ebb80c037b', -- Anti-Steering Form duplicate
  '7b41ee63-fb66-4ee4-a970-b859dfa1b70d', -- Appraisal invoices duplicate
  'd38615b1-cf53-4754-9830-ef7830408cbc', -- Appraisal Transfer duplicate
  '6ec9f9fd-dd92-4ee1-971b-f40c76ce95a4', -- E&O Policy duplicate
  '96d3c312-4975-4b30-920e-eda4f640852e', -- Hazard Insurance duplicate
  'dea23afc-9a55-4abb-81f9-59c8e2306a0e', -- Settlement Statement duplicate
  '631c628c-75f8-4759-b0bf-eb03659e6202', -- Loan Information Form duplicate
  'f439b780-03e5-4c51-b041-bec7929645e5', -- Mortgage Statement duplicate
  '2d52c5bb-6b5a-4acb-a3dc-eb326bd38bd5', -- Payoff Statement duplicate
  '44761120-0435-46f8-ade1-1b6ad3e6b1cd', -- Self-Employed Business duplicate
  '461a902c-819f-402b-81ec-5012cc406db5'  -- Prelim CD duplicate
);