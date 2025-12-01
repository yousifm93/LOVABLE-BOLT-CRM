-- Fix existing email templates to remove hardcoded body padding
UPDATE email_templates 
SET html = REPLACE(html, 'padding: 20px;', 'padding: 0;')
WHERE html LIKE '%padding: 20px%';