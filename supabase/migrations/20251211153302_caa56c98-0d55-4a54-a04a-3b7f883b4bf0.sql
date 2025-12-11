-- Fix documents that have full URLs instead of storage paths
-- These were created by inbound-email-webhook before the fix

-- Fix Kirk document (signed URL format)
UPDATE public.documents 
SET file_url = '9f7e9818-c528-42d7-b762-7f4967458c4e/email-attachments/25-26_Master_-_Shellpoint_Mortgage_Servicing_ISAOAATIMA.pdf-Kirk-1765464605785'
WHERE id = '519c3ee8-56a7-4ad1-87da-fb8906d29b3e';

-- Fix Bekhou document (public URL format)
UPDATE public.documents 
SET file_url = '2d0fc3d0-1fdd-4426-b7ab-d0e710197d73/email-attachments/25-26_Master_-_Shellpoint_Mortgage_Servicing_ISAOAATIMA.pdf-Bekhou-1765382260841'
WHERE id = '2b83e87b-4f0c-482f-b54b-624c0b2486fe';