-- Add lender_id to email_logs
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS lender_id UUID REFERENCES public.lenders(id);

-- Ensure lenders has all tracking columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lenders' AND column_name = 'last_email_opened') THEN
        ALTER TABLE public.lenders ADD COLUMN last_email_opened BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lenders' AND column_name = 'last_email_opened_at') THEN
        ALTER TABLE public.lenders ADD COLUMN last_email_opened_at TIMESTAMP WITH TIME ZONE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lenders' AND column_name = 'last_email_replied') THEN
        ALTER TABLE public.lenders ADD COLUMN last_email_replied BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lenders' AND column_name = 'last_email_replied_at') THEN
        ALTER TABLE public.lenders ADD COLUMN last_email_replied_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_email_logs_lender_id ON public.email_logs(lender_id);