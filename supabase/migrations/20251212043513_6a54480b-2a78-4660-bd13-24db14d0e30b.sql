-- Create two new email templates

-- Template 1: The Ticking Clock - CD Sent to Borrower
INSERT INTO email_templates (name, html, json_blocks)
VALUES (
  'The Ticking Clock - Initial CD Sent',
  '<div style="font-family: Arial, sans-serif;">
<p>Hey <strong>{{first_name}}</strong>!</p>
<p>Good news, we''re almost at the finish line :)</p>
<p>You just received an email from "<strong>{{lender_name}}</strong>" containing your ICD - Initial Closing Disclosure.</p>
<p><strong>This needs to be e-signed today, to comply with mortgage regulations.</strong></p>
<p>Keep in mind that these #''s aren''t final, and we''ll be working with your title company to finalize your #''s.</p>
<p>Please let us know when you''ve signed, so we can stay on track for your closing on <strong>{{close_date}}</strong>.</p>
</div>',
  '{"subject": "{{first_name}}, We Need Your Autograph!"}'::jsonb
);

-- Template 2: Partner Handoff - Disclosures Ordered to Buyer's Agent
INSERT INTO email_templates (name, html, json_blocks)
VALUES (
  'The Partner Handoff - Disclosures Ordered',
  '<div style="font-family: Arial, sans-serif;">
<p><strong>{{buyer_agent_first_name}}</strong>,</p>
<p>Hope you''re doing great! Wanted to let you know that we''ve ordered <strong>{{first_name}}</strong>''s initial disclosure package.</p>
<p>As soon as they sign, we''ll submit the file to underwriting.</p>
<p>In the meantime, please reply confirming that the below contact info is correct:</p>
<ul>
<li><strong>Buyer''s Agent:</strong> {{buyer_agent_name}}<br/>
• Phone: {{buyer_agent_phone}}<br/>
• Email: {{buyer_agent_email}}</li>
<li><strong>Seller''s Agent:</strong> {{listing_agent_name}}<br/>
• Phone: {{listing_agent_phone}}<br/>
• Email: {{listing_agent_email}}</li>
<li><strong>Title:</strong> {{title_contact_name}}<br/>
• Phone: {{title_contact_phone}}<br/>
• Email: {{title_contact_email}}</li>
</ul>
</div>',
  '{"subject": "Update: {{first_name}} {{last_name}} #{{lender_loan_number}}"}'::jsonb
);

-- Create email automations for both templates

-- Automation 1: Ticking Clock - CD Sent
INSERT INTO email_automations (name, trigger_type, trigger_config, pipeline_group, recipient_type, template_id, is_active)
VALUES (
  'The Ticking Clock - CD Sent',
  'status_changed',
  '{"field": "cd_status", "target_status": "Sent"}'::jsonb,
  'active',
  'borrower',
  (SELECT id FROM email_templates WHERE name = 'The Ticking Clock - Initial CD Sent' LIMIT 1),
  true
);

-- Automation 2: Partner Handoff - Disclosures Ordered
INSERT INTO email_automations (name, trigger_type, trigger_config, pipeline_group, recipient_type, template_id, is_active)
VALUES (
  'Partner Handoff - Disclosures Ordered',
  'status_changed',
  '{"field": "disclosure_status", "target_status": "Ordered"}'::jsonb,
  'active',
  'buyer_agent',
  (SELECT id FROM email_templates WHERE name = 'The Partner Handoff - Disclosures Ordered' LIMIT 1),
  true
);