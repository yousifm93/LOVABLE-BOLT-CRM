-- Fix Ashley's profile account_id to match the main CRM account
-- This will allow her to see conditions and all lead-related data
UPDATE profiles 
SET account_id = '47e707c5-62d0-4ee9-99a3-76572c73a8e1'
WHERE user_id = '9e041525-3915-4b18-8e95-e5e1a1fd8d51';