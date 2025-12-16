-- Delete 13 duplicate conditions for Cullen Mahoney
DELETE FROM lead_conditions WHERE id IN (
  -- Proof of Mortgage Payment duplicate
  '979de79e-058b-4674-805d-739b0fcb8e7d',
  -- Proof of Primary duplicates (keep 442e8d5d)
  'd96a463f-b2aa-4ad1-9360-0236ed831097',
  'b1a4fc91-4632-40e2-a23e-af551135f8da',
  '9b784339-6e39-4d85-9ee6-69f77caa858b',
  -- Proof of Purchase duplicate
  'e900e7ce-50f3-4e80-8460-97b4e4002ce4',
  -- Property Survey duplicate
  '3c66c6d5-5af7-405d-a9f3-3dbc1749c7e7',
  -- Quitclaim Deed duplicates (keep 7834b1d3)
  '78b64c9a-a317-4c71-b13c-57198bdcb6c4',
  'c9c82aaf-1f1f-4aab-ad1e-bf31b90ebb1f',
  '97dceb31-5b84-4622-bcb7-bd5b751d5a83',
  -- Third party processing invoice duplicate
  '238fc36e-30db-48a1-86c2-0f09eaf0dd67',
  -- Three-Day CD duplicate
  'e3ce707c-8be7-4140-adbc-bee95cf08be5',
  -- Appraisal invoices (redundant)
  '7a28ceea-c1b9-4d00-9742-ee6c0fdbe678',
  -- Prelim CD (redundant)
  '4e8390ef-2e9a-467e-b4f2-5d2c3a29c170'
);

-- Rename improperly named conditions
UPDATE lead_conditions SET 
  description = 'Settlement Statement',
  notes = 'Less than 12-month seasoning. Provide final settlement statement from purchase. Maximum CLTV reduced by 5% from applicable eligibility matrix.',
  needed_from = 'Borrower'
WHERE id = '011fb102-5dda-4909-bfef-d1ce0da4387b';

UPDATE lead_conditions SET 
  description = 'Business Narrative Form',
  notes = 'Self-Employed Business Narrative Form required for each self-employed business: https://admortgage.com/wp-content/uploads/Self-Employed-Business-Narrative-Form.pdf',
  needed_from = 'Borrower'
WHERE id = '3d2d1bfe-e12b-4f3b-9ed2-3ea5bdd4593f';

UPDATE lead_conditions SET 
  description = 'Third-Party Processing Invoices',
  notes = 'Processing invoice required. State license information required in certain states.',
  needed_from = 'Lender'
WHERE id = '0c2bd1d2-1211-4350-9a77-728ffdcdde11';