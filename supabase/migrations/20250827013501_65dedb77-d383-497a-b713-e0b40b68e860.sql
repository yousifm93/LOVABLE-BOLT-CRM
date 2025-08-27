-- Add missing enum values for referred_via
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'Text';
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'Call';
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'Web';  
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'In Person';

-- Update converted_status enum to fix casing
UPDATE leads SET converted = 'Working On It' WHERE converted = 'Working on it';