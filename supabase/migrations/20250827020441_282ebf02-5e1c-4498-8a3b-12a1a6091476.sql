-- Add missing referred_via enum values to match UI expectations
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'Text';
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'Call';
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'Web';
ALTER TYPE referred_via ADD VALUE IF NOT EXISTS 'In Person';