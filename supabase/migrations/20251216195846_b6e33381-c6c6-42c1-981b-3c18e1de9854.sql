-- Add custom_fields JSONB column to lenders table for dynamic field storage
ALTER TABLE public.lenders
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.lenders.custom_fields IS 'Stores user-defined custom fields as key-value pairs. Structure: { "field_name": { "value": any, "type": "product|currency|date|number|ltv", "label": "Display Name" } }';