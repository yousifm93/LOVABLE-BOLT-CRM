-- ============================================================================
-- Batch 3: Field Corrections and Descriptions (~40 fields)
-- ============================================================================

-- 1. occupancy: Update dropdown options to proper case
UPDATE public.crm_fields
SET 
  dropdown_options = '["Primary Home", "Second Home", "Investment"]'::jsonb,
  description = 'How the borrower will occupy the property'
WHERE field_name = 'occupancy';

-- 2. other_assets: Add description
UPDATE public.crm_fields
SET description = 'Other assets not categorized elsewhere'
WHERE field_name = 'other_assets';

-- 3. other_income: Add description
UPDATE public.crm_fields
SET description = 'Other income sources for the borrower'
WHERE field_name = 'other_income';

-- 4. other_monthly_debts: Add description
UPDATE public.crm_fields
SET description = 'Other monthly debt obligations not categorized elsewhere'
WHERE field_name = 'other_monthly_debts';

-- 5. overtime_income: Add description
UPDATE public.crm_fields
SET description = 'Overtime income for the borrower'
WHERE field_name = 'overtime_income';

-- 6. own_rent_current_address: Add description
UPDATE public.crm_fields
SET description = 'Whether the borrower owns or rents their current address'
WHERE field_name = 'own_rent_current_address';

-- 7. package_status: Update dropdown options and add description
UPDATE public.crm_fields
SET 
  dropdown_options = '["Initial", "Final"]'::jsonb,
  description = 'Status of the final closing package'
WHERE field_name = 'package_status';

-- 8. phone: Rename to borrower_phone
UPDATE public.crm_fields
SET 
  field_name = 'borrower_phone',
  display_name = 'Borrower Phone',
  description = 'Primary phone number for the borrower'
WHERE field_name = 'phone';

-- 9. piti: Add description
UPDATE public.crm_fields
SET description = 'Total monthly payment including Principal, Interest, Taxes, Insurance, MI, and HOA dues'
WHERE field_name = 'piti';

-- 10. pre_approved_at: Ensure editable and add description
UPDATE public.crm_fields
SET description = 'Timestamp when the lead entered the Pre-Approved pipeline stage (computed but editable)'
WHERE field_name = 'pre_approved_at';

-- 11. pre_qualified_at: Ensure editable and add description
UPDATE public.crm_fields
SET description = 'Timestamp when the lead entered the Pre-Qualified pipeline stage (computed but editable)'
WHERE field_name = 'pre_qualified_at';

-- 12. principal_interest: Add description
UPDATE public.crm_fields
SET description = 'Principal and interest portion of the monthly payment'
WHERE field_name = 'principal_interest';

-- 13. priority: Add description
UPDATE public.crm_fields
SET description = 'Lead priority level'
WHERE field_name = 'priority';

-- 14. program: Add description
UPDATE public.crm_fields
SET description = 'Loan program (e.g., Conventional, FHA, VA)'
WHERE field_name = 'program';

-- 15. property_taxes: Add description
UPDATE public.crm_fields
SET description = 'Monthly property taxes'
WHERE field_name = 'property_taxes';

-- 16. property_type: Update dropdown options to proper case and add description
UPDATE public.crm_fields
SET 
  dropdown_options = '["Single Family", "Condo", "Townhouse", "Multi-Family", "Other"]'::jsonb,
  description = 'Type of property being purchased'
WHERE field_name = 'property_type';

-- 17. reo: Add description
UPDATE public.crm_fields
SET description = 'Real Estate Owned - whether the borrower owns other real estate'
WHERE field_name = 'reo';

-- 18. residency_type: Rename to residency_status and update options
UPDATE public.crm_fields
SET 
  field_name = 'residency_status',
  display_name = 'Residency Status',
  dropdown_options = '["Citizen", "Permanent Resident", "Non-Permanent Resident", "Foreign National"]'::jsonb,
  description = 'Borrower residency status in the United States'
WHERE field_name = 'residency_type';

-- 19. retirement_accounts: Add description
UPDATE public.crm_fields
SET description = 'Value of retirement accounts (401k, IRA, etc.)'
WHERE field_name = 'retirement_accounts';

-- 20. sales_price: Add description
UPDATE public.crm_fields
SET description = 'Sales price of the property'
WHERE field_name = 'sales_price';

-- 21. savings_account: Add description
UPDATE public.crm_fields
SET description = 'Balance in savings accounts'
WHERE field_name = 'savings_account';

-- 22. search_stage: Update dropdown options to proper case and add description
UPDATE public.crm_fields
SET 
  dropdown_options = '["Just Looking", "Shopping", "Under Contract", "Long Term"]'::jsonb,
  description = 'Stage of the property search process when pre-approved'
WHERE field_name = 'search_stage';

-- 23. self_employment_income: Add description
UPDATE public.crm_fields
SET description = 'Self-employment income for the borrower'
WHERE field_name = 'self_employment_income';

-- 24. ssn: Add description
UPDATE public.crm_fields
SET description = 'Social Security Number for the borrower'
WHERE field_name = 'ssn';

-- 25. student_loans: Add description
UPDATE public.crm_fields
SET description = 'Monthly student loan payments'
WHERE field_name = 'student_loans';

-- 26. subject_address_1: Add description
UPDATE public.crm_fields
SET description = 'Street address line 1 of the subject property'
WHERE field_name = 'subject_address_1';

-- 27. subject_address_2: Add description
UPDATE public.crm_fields
SET description = 'Street address line 2 of the subject property (unit, apt, etc.)'
WHERE field_name = 'subject_address_2';

-- 28. subject_city: Add description
UPDATE public.crm_fields
SET description = 'City of the subject property'
WHERE field_name = 'subject_city';

-- 29. subject_state: Add description
UPDATE public.crm_fields
SET description = 'State of the subject property'
WHERE field_name = 'subject_state';

-- 30. subject_zip: Add description
UPDATE public.crm_fields
SET description = 'ZIP code of the subject property'
WHERE field_name = 'subject_zip';

-- 31. team: Add description
UPDATE public.crm_fields
SET description = 'Computed display name of the assigned team member'
WHERE field_name = 'team';

-- 32. teammate_assigned: Add description
UPDATE public.crm_fields
SET description = 'Team member assigned to this lead'
WHERE field_name = 'teammate_assigned';

-- 33. term: Add description
UPDATE public.crm_fields
SET description = 'Loan amortization term in years (typically 10-40 years)'
WHERE field_name = 'term';

-- 34. time_at_current_address_months: Add description
UPDATE public.crm_fields
SET description = 'Months component of time at current address'
WHERE field_name = 'time_at_current_address_months';

-- 35. time_at_current_address_years: Add description
UPDATE public.crm_fields
SET description = 'Years component of time at current address'
WHERE field_name = 'time_at_current_address_years';

-- 36. title_eta: Add description
UPDATE public.crm_fields
SET description = 'Estimated completion date for title work'
WHERE field_name = 'title_eta';

-- 37. title_file: Add description
UPDATE public.crm_fields
SET description = 'Uploaded title documentation'
WHERE field_name = 'title_file';

-- 38. title_notes: Add description
UPDATE public.crm_fields
SET description = 'Notes regarding title work and issues'
WHERE field_name = 'title_notes';

-- 39. title_ordered_date: Add description
UPDATE public.crm_fields
SET description = 'Date when title work was ordered'
WHERE field_name = 'title_ordered_date';

-- 40. title_status: Add description
UPDATE public.crm_fields
SET description = 'Current status of title work'
WHERE field_name = 'title_status';

-- 41. total_monthly_income: Add description
UPDATE public.crm_fields
SET description = 'Total combined monthly income for the borrower'
WHERE field_name = 'total_monthly_income';