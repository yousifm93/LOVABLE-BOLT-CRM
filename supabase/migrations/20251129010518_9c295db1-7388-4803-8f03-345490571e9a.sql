-- Insert missing application_users record for Sammy Yarbou with email verified
INSERT INTO application_users (id, email, first_name, last_name, email_verified, created_at, updated_at)
VALUES (
  '7461735d-01c2-45a5-8c27-60acaeef5e51',
  'mbborrower+sammmy@gmail.com',
  'Sammy',
  'Yarbou',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET email_verified = true;

-- Insert mortgage_applications record so Sammy sees their submitted application
INSERT INTO mortgage_applications (user_id, status, submitted_at, application_data, created_at, updated_at)
VALUES (
  '7461735d-01c2-45a5-8c27-60acaeef5e51',
  'submitted',
  '2025-11-28 23:02:06.713+00',
  '{
    "loanPurpose": "Purchase",
    "personalInfo": {
      "firstName": "Sammy",
      "lastName": "Yarbou",
      "email": "mbborrower+sammmy@gmail.com"
    },
    "mortgageInfo": {
      "propertyType": "Condo",
      "occupancy": "Investment",
      "purchasePrice": 500000,
      "downPayment": 50000
    }
  }'::jsonb,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO NOTHING;