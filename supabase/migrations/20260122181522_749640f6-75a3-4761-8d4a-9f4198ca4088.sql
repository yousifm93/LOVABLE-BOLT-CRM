-- Add metadata columns for document upload tracking
ALTER TABLE public.condos
ADD COLUMN IF NOT EXISTS budget_doc_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS budget_doc_uploaded_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS mip_doc_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mip_doc_uploaded_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS cq_doc_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cq_doc_uploaded_by UUID REFERENCES public.users(id);

-- Insert task automations for document upload reminders
-- Valid subcategories: appraisal, closing, submission, other
-- Ashley's ID: 3dca68fc-ee7e-46cc-91a1-0c6176d4c32a
-- Herman's ID: fa92a4c6-890d-4d69-99a8-c3adc6c904ee

INSERT INTO task_automations (
  name, trigger_type, trigger_config, task_name, task_description,
  assigned_to_user_id, task_priority, due_date_offset_days, is_active, category, subcategory
) VALUES
-- Condo docs when condo_status = Received
(
  'Condo Received - Upload Condo Docs',
  'status_changed',
  '{"field": "condo_status", "target_status": "Received"}',
  'Upload condo docs',
  'Upload condo documents (Budget, MIP, CQ) to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'other'
),
-- Disclosure docs when disclosure_status = Sent
(
  'Disclosure Sent - Upload Disclosure Document',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Sent"}',
  'Upload disclosure document',
  'Upload the disclosure document to the lead file',
  'fa92a4c6-890d-4d69-99a8-c3adc6c904ee',
  'High',
  0,
  true,
  'active_loan',
  'submission'
),
-- Appraisal when appraisal_status = Received
(
  'Appraisal Received - Upload Appraisal Document',
  'status_changed',
  '{"field": "appraisal_status", "target_status": "Received"}',
  'Upload appraisal document',
  'Upload the appraisal document to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'appraisal'
),
-- Initial approval when loan_status = AWC
(
  'Loan AWC - Upload Initial Approval',
  'status_changed',
  '{"field": "loan_status", "target_status": "AWC"}',
  'Upload initial approval',
  'Upload the initial approval document to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'submission'
),
-- HOI when hoi_status = Bound
(
  'Insurance Bound - Upload HOI Policy',
  'status_changed',
  '{"field": "hoi_status", "target_status": "Bound"}',
  'Upload HOI policy',
  'Upload the homeowners insurance policy to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'closing'
),
-- CD when cd_status = Sent
(
  'CD Sent - Upload CD',
  'status_changed',
  '{"field": "cd_status", "target_status": "Sent"}',
  'Upload CD',
  'Upload the Closing Disclosure document to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'closing'
),
-- Final closing package when package_status = Final
(
  'Package Final - Upload Final Closing Package',
  'status_changed',
  '{"field": "package_status", "target_status": "Final"}',
  'Upload final closing package',
  'Upload the final closing package to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'closing'
),
-- Title when title_status = Received
(
  'Title Received - Upload Title Work',
  'status_changed',
  '{"field": "title_status", "target_status": "Received"}',
  'Upload title work',
  'Upload the title work documents to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'closing'
),
-- Rate lock when rate_lock_expiration is filled
(
  'Rate Locked - Upload Rate Confirmation',
  'status_changed',
  '{"field": "rate_lock_expiration", "target_status": "*"}',
  'Upload rate confirmation',
  'Upload the rate lock confirmation to the lead file',
  '3dca68fc-ee7e-46cc-91a1-0c6176d4c32a',
  'High',
  0,
  true,
  'active_loan',
  'other'
);