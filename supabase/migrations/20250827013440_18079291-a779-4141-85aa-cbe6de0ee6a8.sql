-- First, get current enum values
SELECT unnest(enum_range(NULL::referred_via)) as referred_via_values;
SELECT unnest(enum_range(NULL::referral_source)) as referral_source_values;
SELECT unnest(enum_range(NULL::converted_status)) as converted_status_values;

-- Update referred_via enum
ALTER TYPE referred_via RENAME TO referred_via_old;
CREATE TYPE referred_via AS ENUM ('Email', 'Text', 'Call', 'Web', 'In Person');
ALTER TABLE leads ALTER COLUMN referred_via TYPE referred_via USING 
  CASE referred_via_old::text
    WHEN 'email' THEN 'Email'::referred_via
    WHEN 'text' THEN 'Text'::referred_via
    WHEN 'call' THEN 'Call'::referred_via
    WHEN 'web' THEN 'Web'::referred_via
    WHEN 'in_person' THEN 'In Person'::referred_via
    ELSE 'Email'::referred_via
  END;
DROP TYPE referred_via_old;

-- Update referral_source enum
ALTER TYPE referral_source RENAME TO referral_source_old;
CREATE TYPE referral_source AS ENUM ('Agent', 'New Agent', 'Past Client', 'Personal', 'Social', 'Miscellaneous');
ALTER TABLE leads ALTER COLUMN referral_source TYPE referral_source USING 
  CASE referral_source_old::text
    WHEN 'agent' THEN 'Agent'::referral_source
    WHEN 'new_agent' THEN 'New Agent'::referral_source
    WHEN 'past_client' THEN 'Past Client'::referral_source
    WHEN 'personal' THEN 'Personal'::referral_source
    WHEN 'social' THEN 'Social'::referral_source
    ELSE 'Miscellaneous'::referral_source
  END;
DROP TYPE referral_source_old;

-- Update converted_status enum
ALTER TYPE converted_status RENAME TO converted_status_old;
CREATE TYPE converted_status AS ENUM ('Working On It', 'Pending App', 'Nurture', 'Dead', 'Needs Attention');
ALTER TABLE leads ALTER COLUMN converted TYPE converted_status USING 
  CASE converted_status_old::text
    WHEN 'Working on it' THEN 'Working On It'::converted_status
    WHEN 'Pending App' THEN 'Pending App'::converted_status
    WHEN 'Nurture' THEN 'Nurture'::converted_status
    WHEN 'Dead' THEN 'Dead'::converted_status
    WHEN 'Needs Attention' THEN 'Needs Attention'::converted_status
    ELSE 'Working On It'::converted_status
  END;
DROP TYPE converted_status_old;