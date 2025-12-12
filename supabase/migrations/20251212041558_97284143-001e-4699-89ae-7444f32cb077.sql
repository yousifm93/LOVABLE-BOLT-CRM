-- Update email templates to remove centering (left-align emails)
UPDATE email_templates 
SET html = REPLACE(html, 'max-width: 600px; margin: 0 auto;', '')
WHERE html LIKE '%max-width: 600px; margin: 0 auto;%';

-- Add subject to json_blocks for existing templates
UPDATE email_templates 
SET json_blocks = jsonb_build_object('subject', 'ACTION REQUIRED: Your Loan Documents are Ready ✍️')
WHERE name = 'Starter Gun - Initial Disclosures';

UPDATE email_templates 
SET json_blocks = jsonb_build_object('subject', 'GREAT NEWS: You are Conditionally Approved! 🎉')
WHERE name = 'Deep Breath - Conditional Approval';

UPDATE email_templates 
SET json_blocks = jsonb_build_object('subject', '✅ CLEAR TO CLOSE: We are ready for the finish line!')
WHERE name = 'Finish Line - Clear to Close';