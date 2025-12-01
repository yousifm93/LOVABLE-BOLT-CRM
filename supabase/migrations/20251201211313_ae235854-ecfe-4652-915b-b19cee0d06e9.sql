-- Add email_signature column to users table for storing HTML email signatures
ALTER TABLE public.users ADD COLUMN email_signature TEXT;