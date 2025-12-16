-- Add broker_open timestamp to buyer_agents table
ALTER TABLE public.buyer_agents 
ADD COLUMN broker_open timestamp with time zone;