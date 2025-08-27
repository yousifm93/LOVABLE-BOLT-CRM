-- Update enum values to match specifications
DROP TYPE IF EXISTS referred_via CASCADE;
CREATE TYPE referred_via AS ENUM ('Email', 'Text', 'Call', 'Web', 'In Person');

DROP TYPE IF EXISTS referral_source CASCADE;
CREATE TYPE referral_source AS ENUM ('Agent', 'New Agent', 'Past Client', 'Personal', 'Social', 'Miscellaneous');

DROP TYPE IF EXISTS converted_status CASCADE;
CREATE TYPE converted_status AS ENUM ('Working On It', 'Pending App', 'Nurture', 'Dead', 'Needs Attention');

-- Update the leads table to use the new enum types
ALTER TABLE leads 
ALTER COLUMN referred_via TYPE referred_via USING referred_via::text::referred_via,
ALTER COLUMN referral_source TYPE referral_source USING referral_source::text::referral_source,
ALTER COLUMN converted TYPE converted_status USING 
  CASE 
    WHEN converted::text = 'Working on it' THEN 'Working On It'::converted_status
    ELSE converted::text::converted_status
  END;