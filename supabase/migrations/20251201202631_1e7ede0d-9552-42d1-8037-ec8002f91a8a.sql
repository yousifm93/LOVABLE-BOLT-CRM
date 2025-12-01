-- Fix Diana Alzate's appraisal file path to use storage path instead of public URL
UPDATE leads 
SET appraisal_file = 'files/cd14244c-d1bb-4b40-afcc-fb9c5a520e19/appraisal/1764620324521_71e702859b38a412314be3576e293553.pdf'
WHERE id = 'cd14244c-d1bb-4b40-afcc-fb9c5a520e19'
AND appraisal_file LIKE '%documents%';