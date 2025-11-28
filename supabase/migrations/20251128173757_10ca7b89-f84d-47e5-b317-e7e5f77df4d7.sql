-- Add email verification fields to application_users table
ALTER TABLE public.application_users
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN verification_token TEXT,
ADD COLUMN verification_sent_at TIMESTAMP WITH TIME ZONE;