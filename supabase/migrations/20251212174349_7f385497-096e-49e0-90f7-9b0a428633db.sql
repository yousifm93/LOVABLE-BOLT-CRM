-- Insert 4 new email templates

-- 1. CTC - Listing Agent Notification
INSERT INTO email_templates (name, html, json_blocks, version)
VALUES (
  'CTC - Listing Agent Notification',
  '<p>Hey {{listing_agent_first_name}},</p>
<p>Great news! <strong>{{borrower_name}}</strong>''s loan at <strong>{{property_address}}</strong> is officially <strong>Clear to Close!</strong></p>
<p>We''re scheduled to close on <strong>{{close_date}}</strong>. Thank you for your patience and coordination throughout this process.</p>
<p>Is there anything you need from us as we approach closing? Please don''t hesitate to reach out.</p>',
  '{"subject": "CLEAR TO CLOSE: {{borrower_name}} at {{property_address}} 🎉"}',
  1
);

-- 2. Closing Day - Thank You to Agents
INSERT INTO email_templates (name, html, json_blocks, version)
VALUES (
  'Closing Day - Thank You to Agents',
  '<p>Hey {{buyer_agent_first_name}} and {{listing_agent_first_name}},</p>
<p>Just wanted to reach out and say <strong>THANK YOU</strong> for all your professionalism throughout the <strong>{{property_address}}</strong> transaction!</p>
<p>Our buyer <strong>{{first_name}}</strong> is thrilled, and we hope the seller is equally happy.</p>
<p>We truly appreciate the opportunity to have worked together. If there''s anything you ever need, don''t hesitate to reach out.</p>
<p>Looking forward to working with you again soon!</p>',
  '{"subject": "Thank You for a Great Closing! - {{property_address}} 🏠"}',
  1
);

-- 3. Condo Association Tenant Approval Reminder
INSERT INTO email_templates (name, html, json_blocks, version)
VALUES (
  'Condo Association Tenant Approval Reminder',
  '<p>Hey {{first_name}},</p>
<p>Congratulations on submitting your loan application!</p>
<p><strong>Important Note for Condo Buyers:</strong> Many condo associations require personal tenant/owner approval before you can move in. This is a separate process from your mortgage approval.</p>
<p><strong>ACTION REQUIRED:</strong> If you haven''t already applied to become an approved tenant/owner with your condo association, please do so as soon as possible. This process can sometimes take 2-4 weeks and could delay your closing if not started early.</p>
<p>Need the HOA contact info? Just let me know and I''ll help you find it.</p>
<p>Questions? Just reply to this email.</p>',
  '{"subject": "ACTION REQUIRED: Condo Association Approval - {{property_address}}"}',
  1
);

-- 4. Appraisal Scheduled - Agents Notification
INSERT INTO email_templates (name, html, json_blocks, version)
VALUES (
  'Appraisal Scheduled - Agents Notification',
  '<p>Hey {{buyer_agent_first_name}} and {{listing_agent_first_name}},</p>
<p>Just a heads up — the appraisal for <strong>{{borrower_name}}</strong> at <strong>{{property_address}}</strong> has been scheduled!</p>
<p><strong>📅 Appraisal Date/Time:</strong> {{appr_date_time}}</p>
<p>Please ensure the property is accessible and ready for inspection. If someone needs to be present or any access arrangements need to be made, please coordinate accordingly.</p>
<p>Let us know if you have any questions or need to reschedule.</p>',
  '{"subject": "Appraisal Scheduled: {{borrower_name}} at {{property_address}}"}',
  1
);

-- Now insert the 4 email automations

-- 1. CTC - Listing Agent (triggers when loan_status changes to CTC)
INSERT INTO email_automations (name, pipeline_group, trigger_type, trigger_config, recipient_type, template_id, is_active, purpose)
SELECT 
  'CTC - Listing Agent Notification',
  'active',
  'status_changed',
  '{"field": "loan_status", "target_status": "CTC"}',
  'listing_agent',
  id,
  true,
  'Notify listing agent when loan is Clear to Close'
FROM email_templates WHERE name = 'CTC - Listing Agent Notification';

-- 2. Closing Day - Thank You to Agents (date-based on close_date = today, package = Final)
INSERT INTO email_automations (name, pipeline_group, trigger_type, trigger_config, recipient_type, cc_recipient_type, template_id, is_active, purpose, conditions)
SELECT 
  'Closing Day - Thank You to Agents',
  'active',
  'date_based',
  '{"date_field": "close_date", "offset_days": 0, "send_time": "08:00"}',
  'buyer_agent',
  'listing_agent',
  id,
  true,
  'Thank buyer''s agent and listing agent on closing day',
  '{"field": "package_status", "operator": "=", "compare_value": "Final"}'
FROM email_templates WHERE name = 'Closing Day - Thank You to Agents';

-- 3. Condo Association Reminder (triggers when loan_status = SUB AND property_type = Condo)
INSERT INTO email_automations (name, pipeline_group, trigger_type, trigger_config, recipient_type, cc_recipient_type, template_id, is_active, purpose, conditions)
SELECT 
  'Condo Association Tenant Approval Reminder',
  'active',
  'status_changed',
  '{"field": "loan_status", "target_status": "SUB", "send_time": "18:30"}',
  'borrower',
  'buyer_agent',
  id,
  true,
  'Remind condo buyers to apply for tenant approval when loan is submitted',
  '{"field": "property_type", "operator": "=", "compare_value": "Condo"}'
FROM email_templates WHERE name = 'Condo Association Tenant Approval Reminder';

-- 4. Appraisal Scheduled - Agents Notification (triggers when appraisal_status = Scheduled)
INSERT INTO email_automations (name, pipeline_group, trigger_type, trigger_config, recipient_type, cc_recipient_type, template_id, is_active, purpose, conditions)
SELECT 
  'Appraisal Scheduled - Agents Notification',
  'active',
  'status_changed',
  '{"field": "appraisal_status", "target_status": "Scheduled"}',
  'buyer_agent',
  'listing_agent',
  id,
  true,
  'Notify both agents when appraisal is scheduled with date/time',
  '{"field": "appr_date_time", "operator": "is_not_null"}'
FROM email_templates WHERE name = 'Appraisal Scheduled - Agents Notification';