-- Create enums for pipeline status fields
CREATE TYPE public.pr_type AS ENUM ('P', 'R', 'HELOC');
CREATE TYPE public.disclosure_status AS ENUM ('Ordered', 'Sent', 'Signed', 'Need Signature');
CREATE TYPE public.loan_status AS ENUM ('NEW', 'RFP', 'SUV', 'AWC', 'CTC');
CREATE TYPE public.appraisal_status AS ENUM ('Ordered', 'Scheduled', 'Inspected', 'Received', 'Waiver');
CREATE TYPE public.title_status AS ENUM ('Requested', 'Received');
CREATE TYPE public.hoi_status AS ENUM ('Quoted', 'Ordered', 'Received');
CREATE TYPE public.condo_status AS ENUM ('Ordered', 'Received', 'Approved');
CREATE TYPE public.cd_status AS ENUM ('Requested', 'Sent', 'Signed');
CREATE TYPE public.package_status AS ENUM ('Initial', 'Final');
CREATE TYPE public.ba_status AS ENUM ('Send', 'Sent', 'Signed');
CREATE TYPE public.epo_status AS ENUM ('Send', 'Sent', 'Signed');

-- Add new columns to leads table for pipeline tracking
ALTER TABLE public.leads ADD COLUMN arrive_loan_number INTEGER;
ALTER TABLE public.leads ADD COLUMN pr_type pr_type;
ALTER TABLE public.leads ADD COLUMN disclosure_status disclosure_status;
ALTER TABLE public.leads ADD COLUMN close_date DATE;
ALTER TABLE public.leads ADD COLUMN loan_status loan_status;
ALTER TABLE public.leads ADD COLUMN appraisal_status appraisal_status;
ALTER TABLE public.leads ADD COLUMN title_status title_status;
ALTER TABLE public.leads ADD COLUMN hoi_status hoi_status;
ALTER TABLE public.leads ADD COLUMN condo_status condo_status;
ALTER TABLE public.leads ADD COLUMN cd_status cd_status;
ALTER TABLE public.leads ADD COLUMN package_status package_status;
ALTER TABLE public.leads ADD COLUMN lock_expiration_date DATE;
ALTER TABLE public.leads ADD COLUMN ba_status ba_status;
ALTER TABLE public.leads ADD COLUMN epo_status epo_status;
ALTER TABLE public.leads ADD COLUMN lender_id UUID;
ALTER TABLE public.leads ADD COLUMN listing_agent_id UUID;

-- Add foreign key constraints
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_lender FOREIGN KEY (lender_id) REFERENCES public.contacts(id);
ALTER TABLE public.leads ADD CONSTRAINT fk_leads_listing_agent FOREIGN KEY (listing_agent_id) REFERENCES public.buyer_agents(id);