-- Create email templates for the 3 new automations

-- Template 1: Appraisal Received (Value >= Sales Price)
INSERT INTO email_templates (name, html, json_blocks, is_archived)
VALUES (
  'Appraisal Received - Good News',
  '<div style="font-family: Arial, sans-serif; line-height: 1.6;">
<p>Hey <strong>{{first_name}}</strong>!</p>

<p>I sent you a text, but wanted to let you know that your appraisal is in at <strong>{{appraisal_value}}</strong>!</p>

<p><strong>Congrats on walking into closing with {{equity_amount}} of instant equity!</strong></p>

<p>That is a huge win, thanks to your amazing agent <strong>{{buyer_agent_first_name}}</strong> (cc''d here) finding you a great deal.</p>

<p>You''ll have access to the full report in about 24 hours, and it''ll have some pretty cool info about your property that you may want to check out.</p>
</div>',
  '{"subject": "{{first_name}}, Your Appraisal is in! 📈"}',
  false
);

-- Template 2: It's Closing Day!
INSERT INTO email_templates (name, html, json_blocks, is_archived)
VALUES (
  'It''s Closing Day!',
  '<div style="font-family: Arial, sans-serif; line-height: 1.6;">
<p>Hey <strong>{{first_name}}</strong>!</p>

<p>Congrats on reaching closing day :)</p>

<p>The team &amp; I are extremely grateful to have been able to work with you.</p>

<p><strong>{{buyer_agent_first_name}}</strong> — Popping in to congratulate you on closing <strong>{{first_name}}</strong>''s deal today! We couldn''t have done it without your amazing partnership.</p>

<p>Is there anything you need from us?</p>
</div>',
  '{"subject": "{{first_name}}, It''s Closing Day!!"}',
  false
);

-- Template 3: Listing Agent Intro
INSERT INTO email_templates (name, html, json_blocks, is_archived)
VALUES (
  'Listing Agent Intro',
  '<div style="font-family: Arial, sans-serif; line-height: 1.6;">
<p>Hey <strong>{{listing_agent_first_name}}</strong>!</p>

<p>I wanted to quickly introduce myself and give you an update on <strong>{{first_name}}</strong>.</p>

<p>We have already ordered the initial disclosure package. As soon as the buyer signs (usually within 24 hours), we will be submitting the file directly to underwriting.</p>

<p>I know every lender promises a smooth transaction, but I want to assure you that you are in good hands on this one. We are pushing hard to have this wrapped up by <strong>{{closing_date}}</strong>.</p>

<p>Looking forward to working with you!</p>
</div>',
  '{"subject": "Intro & Update: {{last_name}} - {{property_address}}"}',
  false
);

-- Now create the email automations linking to these templates

-- Automation 1: Appraisal Received (with conditions)
INSERT INTO email_automations (name, trigger_type, trigger_config, pipeline_group, recipient_type, cc_recipient_type, purpose, template_id, is_active, conditions)
SELECT 
  'Appraisal Received - Good News',
  'status_changed',
  '{"field": "appraisal_status", "target_status": "Received"}',
  'active',
  'borrower',
  'buyer_agent',
  'Notify borrower when appraisal comes in at or above sales price',
  id,
  true,
  '{"field": "appraisal_value", "operator": ">=", "compare_field": "sales_price"}'
FROM email_templates WHERE name = 'Appraisal Received - Good News';

-- Automation 2: Closing Day (date-based, runs daily at 7 AM)
INSERT INTO email_automations (name, trigger_type, trigger_config, pipeline_group, recipient_type, cc_recipient_type, purpose, template_id, is_active)
SELECT 
  'It''s Closing Day!',
  'date_based',
  '{"date_field": "close_date", "days_offset": 0, "condition_field": "package_status", "condition_value": "Final"}',
  'active',
  'borrower',
  'buyer_agent',
  'Send congratulations email on closing day morning',
  id,
  true
FROM email_templates WHERE name = 'It''s Closing Day!';

-- Automation 3: Listing Agent Intro (on disclosure ordered)
INSERT INTO email_automations (name, trigger_type, trigger_config, pipeline_group, recipient_type, purpose, template_id, is_active)
SELECT 
  'Listing Agent Intro',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Ordered"}',
  'active',
  'listing_agent',
  'Introduce loan officer to listing agent when disclosures ordered',
  id,
  true
FROM email_templates WHERE name = 'Listing Agent Intro';