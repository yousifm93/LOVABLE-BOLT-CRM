-- Change default value of pipeline_section to null to prevent new leads from appearing in Active
ALTER TABLE leads 
ALTER COLUMN pipeline_section SET DEFAULT null;