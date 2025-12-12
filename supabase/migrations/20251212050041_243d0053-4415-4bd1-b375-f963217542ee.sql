-- Add cc_recipient_type column to email_automations for CC support
ALTER TABLE public.email_automations 
ADD COLUMN IF NOT EXISTS cc_recipient_type text;

-- Add conditions column for conditional logic (e.g., appraisal_value >= sales_price)
ALTER TABLE public.email_automations
ADD COLUMN IF NOT EXISTS conditions jsonb;

-- Add comment for cc_recipient_type
COMMENT ON COLUMN public.email_automations.cc_recipient_type IS 'Optional CC recipient type: borrower, buyer_agent, listing_agent, etc.';

-- Add comment for conditions
COMMENT ON COLUMN public.email_automations.conditions IS 'Conditional logic for sending emails, e.g., {"field": "appraisal_value", "operator": ">=", "compare_field": "sales_price"}';