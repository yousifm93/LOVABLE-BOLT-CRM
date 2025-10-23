-- Add new values to the converted_status ENUM type to support all pipeline stage statuses
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Converted';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'App Complete';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Standby';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'DNA';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Just Applied';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Screening';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Pre-Qualified';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Pre-Approved';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'New';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Shopping';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Offers Out';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Under Contract';
ALTER TYPE converted_status ADD VALUE IF NOT EXISTS 'Long-Term';