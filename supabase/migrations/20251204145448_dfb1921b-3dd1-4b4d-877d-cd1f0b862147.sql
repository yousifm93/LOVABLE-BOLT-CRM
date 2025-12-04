-- Add N/A option to epo_status enum
ALTER TYPE epo_status ADD VALUE IF NOT EXISTS 'N/A';

-- Add N/A option to condo_status enum  
ALTER TYPE condo_status ADD VALUE IF NOT EXISTS 'N/A';