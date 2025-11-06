# CRM Field Reference Guide

**Last Updated**: November 6, 2025  
**Purpose**: Comprehensive documentation of all CRM fields, their types, sections, and merge tag availability.

---

## Table of Contents
1. [Overview](#overview)
2. [Field Sections](#field-sections)
3. [Available Merge Tags](#available-merge-tags)
4. [Contact Relationship Fields](#contact-relationship-fields)
5. [Field Types Reference](#field-types-reference)
6. [Implementation Notes](#implementation-notes)

---

## Overview

The CRM manages **three interconnected field systems**:

1. **`crm_fields` Table** (92+ records): Controls UI visibility, column toggles, and merge tag availability
2. **`leads` Table** (150+ columns): Actual data storage for all lead information
3. **Related Object Tables**: `buyer_agents`, `lenders`, `contacts`, `lead_external_contacts` for relationships

All fields visible in the Lead Details page have corresponding entries in `crm_fields` and are available as email merge tags.

---

## Field Sections

Fields are organized into the following sections:

- **LEAD**: Initial lead capture information
- **BORROWER**: Personal borrower information
- **FINANCIAL**: Income, assets, liabilities, payment details
- **PROPERTY**: Subject property information
- **LOAN**: Loan program, terms, and details
- **OPERATIONS**: Pipeline stage, assignments, priorities
- **DATES**: Timeline and milestone dates
- **INSURANCE**: HOI status, policy files, notes
- **TITLE**: Title work status, files, notes
- **CONDO**: Condo approval information
- **APPRAISAL**: Appraisal status, value, dates
- **DOCUMENTS**: File attachments and uploads
- **META**: System metadata (updated_at, updated_by)

---

## Available Merge Tags

### 1. Borrower Information

| Merge Tag | Display Name | Field Type | Description |
|-----------|--------------|------------|-------------|
| `{{first_name}}` | First Name | text | Borrower's first name |
| `{{last_name}}` | Last Name | text | Borrower's last name |
| `{{middle_name}}` | Middle Name | text | Borrower's middle name |
| `{{borrower_name}}` | Full Name | computed | Full name (first + last) |
| `{{email}}` | Email | text | Borrower's email address |
| `{{phone}}` | Phone | text | Borrower's phone number |
| `{{dob}}` | Date of Birth | date | Borrower's date of birth |
| `{{ssn}}` | SSN | text | Social Security Number |
| `{{marital_status}}` | Marital Status | select | Marital status |
| `{{number_of_dependents}}` | Number of Dependents | number | Number of dependents |
| `{{borrower_current_address}}` | Current Address | text | Current residential address |
| `{{own_rent_current_address}}` | Own/Rent | select | Own or rent current address |
| `{{time_at_current_address_years}}` | Years at Address | number | Years at current address |
| `{{time_at_current_address_months}}` | Months at Address | number | Months at current address |
| `{{military_veteran}}` | Military Veteran | boolean | Is military veteran |
| `{{residency_type}}` | Residency Type | select | US Citizen, Permanent Resident, etc. |

### 2. Loan & Property Details

| Merge Tag | Display Name | Field Type | Description |
|-----------|--------------|------------|-------------|
| `{{loan_amount}}` | Loan Amount | currency | Total loan amount |
| `{{sales_price}}` | Sales Price | currency | Property sales price |
| `{{loan_type}}` | Loan Type | select | Purchase, Refinance, etc. |
| `{{property_type}}` | Property Type | select | Single Family, Condo, etc. |
| `{{occupancy}}` | Occupancy | select | Primary, Investment, etc. |
| `{{program}}` | Loan Program | text | Conventional, FHA, VA, etc. |
| `{{term}}` | Term | number | Loan term in years |
| `{{interest_rate}}` | Interest Rate | percentage | Interest rate |
| `{{down_pmt}}` | Down Payment | text | Down payment amount |
| `{{subject_address_1}}` | Property Address 1 | text | Street address |
| `{{subject_address_2}}` | Property Address 2 | text | Unit/Apt number |
| `{{subject_city}}` | City | text | Property city |
| `{{subject_state}}` | State | text | Property state |
| `{{subject_zip}}` | ZIP Code | text | Property ZIP |
| `{{subject_property_address}}` | Full Address | computed | Complete formatted address |
| `{{reo}}` | REO Property | boolean | Is REO property |
| `{{appraisal_value}}` | Appraisal Value | text | Appraised value |

### 3. Financial Information

#### Income
| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{total_monthly_income}}` | Total Monthly Income | currency |
| `{{base_employment_income}}` | Base Employment Income | currency |
| `{{overtime_income}}` | Overtime Income | currency |
| `{{bonus_income}}` | Bonus Income | currency |
| `{{self_employment_income}}` | Self Employment Income | currency |
| `{{other_income}}` | Other Income | currency |
| `{{income_type}}` | Income Type | select |

#### Assets
| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{assets}}` | Total Assets | currency |
| `{{checking_account}}` | Checking Account | currency |
| `{{savings_account}}` | Savings Account | currency |
| `{{investment_accounts}}` | Investment Accounts | currency |
| `{{retirement_accounts}}` | Retirement Accounts | currency |
| `{{gift_funds}}` | Gift Funds | currency |
| `{{other_assets}}` | Other Assets | currency |

#### Liabilities
| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{monthly_liabilities}}` | Monthly Liabilities | currency |
| `{{credit_card_debt}}` | Credit Card Debt | currency |
| `{{auto_loans}}` | Auto Loans | currency |
| `{{student_loans}}` | Student Loans | currency |
| `{{other_monthly_debts}}` | Other Monthly Debts | currency |

#### Payment Breakdown
| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{piti}}` | PITI (Total Payment) | currency |
| `{{principal_interest}}` | Principal & Interest | currency |
| `{{property_taxes}}` | Property Taxes | currency |
| `{{homeowners_insurance}}` | Homeowners Insurance | currency |
| `{{mortgage_insurance}}` | Mortgage Insurance | currency |
| `{{hoa_dues}}` | HOA Dues | currency |
| `{{monthly_pmt_goal}}` | Monthly Payment Goal | currency |
| `{{cash_to_close_goal}}` | Cash to Close Goal | currency |

#### Ratios
| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{dti}}` | Debt-to-Income Ratio | percentage |
| `{{estimated_fico}}` | Estimated FICO | number |

### 4. Buyer's Agent

| Merge Tag | Display Name | Source |
|-----------|--------------|--------|
| `{{buyer_agent_first_name}}` | First Name | buyer_agents table |
| `{{buyer_agent_last_name}}` | Last Name | buyer_agents table |
| `{{buyer_agent_name}}` | Full Name | Computed |
| `{{buyer_agent_email}}` | Email | buyer_agents table |
| `{{buyer_agent_phone}}` | Phone | buyer_agents table |
| `{{buyer_agent_brokerage}}` | Brokerage | buyer_agents table |
| `{{buyer_agent_company}}` | Company | buyer_agents table |

### 5. Listing Agent

| Merge Tag | Display Name | Source |
|-----------|--------------|--------|
| `{{listing_agent_first_name}}` | First Name | contacts table |
| `{{listing_agent_last_name}}` | Last Name | contacts table |
| `{{listing_agent_name}}` | Full Name | Computed |
| `{{listing_agent_email}}` | Email | contacts table |
| `{{listing_agent_phone}}` | Phone | contacts table |
| `{{listing_agent_company}}` | Company | contacts table |

**Note**: Listing Agent is only populated when lead reaches Active stage and is linked via `lead_external_contacts` table with `type='listing_agent'`.

### 6. Lender & Account Executive

| Merge Tag | Display Name | Source |
|-----------|--------------|--------|
| `{{lender_name}}` | Lender Name | lenders table |
| `{{lender_type}}` | Lender Type | lenders table |
| `{{account_executive}}` | Account Executive | lenders table |
| `{{account_executive_first_name}}` | AE First Name | lenders table |
| `{{account_executive_last_name}}` | AE Last Name | lenders table |
| `{{account_executive_name}}` | AE Full Name | Computed |
| `{{account_executive_email}}` | AE Email | lenders table |
| `{{account_executive_phone}}` | AE Phone | lenders table |
| `{{ae_first_name}}` | AE First Name (Alt) | lenders table |
| `{{ae_last_name}}` | AE Last Name (Alt) | lenders table |
| `{{ae_name}}` | AE Full Name (Alt) | Computed |
| `{{ae_email}}` | AE Email (Alt) | lenders table |
| `{{ae_phone}}` | AE Phone (Alt) | lenders table |

### 7. Third-Party Contacts

#### Title Company
| Merge Tag | Display Name | Source |
|-----------|--------------|--------|
| `{{title_company_name}}` | Company Name | contacts table |
| `{{title_contact_name}}` | Contact Name | contacts table |
| `{{title_contact_first_name}}` | Contact First Name | contacts table |
| `{{title_contact_last_name}}` | Contact Last Name | contacts table |
| `{{title_contact_email}}` | Contact Email | contacts table |
| `{{title_contact_phone}}` | Contact Phone | contacts table |

#### Insurance Provider
| Merge Tag | Display Name | Source |
|-----------|--------------|--------|
| `{{insurance_provider_name}}` | Provider Name | contacts table |
| `{{insurance_contact_name}}` | Contact Name | contacts table |
| `{{insurance_contact_first_name}}` | Contact First Name | contacts table |
| `{{insurance_contact_last_name}}` | Contact Last Name | contacts table |
| `{{insurance_contact_email}}` | Contact Email | contacts table |
| `{{insurance_contact_phone}}` | Contact Phone | contacts table |

### 8. Dates & Timeline

| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{lead_on_date}}` | Lead Date | date |
| `{{close_date}}` | Close Date | date |
| `{{pending_app_at}}` | Pending App Date | datetime |
| `{{app_complete_at}}` | App Complete Date | datetime |
| `{{pre_qualified_at}}` | Pre-Qualified Date | datetime |
| `{{pre_approved_at}}` | Pre-Approved Date | datetime |
| `{{active_at}}` | Active Date | datetime |
| `{{closed_at}}` | Closed Date | datetime |
| `{{lock_expiration_date}}` | Lock Expiration | date |
| `{{appr_date_time}}` | Appraisal Date/Time | datetime |
| `{{appr_eta}}` | Appraisal ETA | date |
| `{{title_eta}}` | Title ETA | date |
| `{{title_ordered_date}}` | Title Ordered Date | date |
| `{{fin_cont}}` | Finance Contingency | date |
| `{{task_eta}}` | Task ETA | date |

### 9. Status & Operations

| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{status}}` | Lead Status | select |
| `{{pipeline_stage_name}}` | Pipeline Stage | computed |
| `{{pipeline_stage_slug}}` | Stage Slug | computed |
| `{{priority}}` | Priority | select |
| `{{lead_strength}}` | Lead Strength | select |
| `{{likely_to_apply}}` | Likely to Apply | text |
| `{{search_stage}}` | Search Stage | text |
| `{{converted}}` | Converted Status | select |
| `{{is_closed}}` | Is Closed | boolean |
| `{{source}}` | Lead Source | select |
| `{{referred_via}}` | Referred Via | select |
| `{{referral_source}}` | Referral Source | select |
| `{{assigned_user_name}}` | Assigned To | computed |
| `{{assigned_user_first_name}}` | Assigned First Name | computed |
| `{{assigned_user_last_name}}` | Assigned Last Name | computed |
| `{{assigned_user_email}}` | Assigned Email | computed |
| `{{arrive_loan_number}}` | Arrive Loan # | number |

### 10. Third-Party Status Fields

| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{appraisal_status}}` | Appraisal Status | select |
| `{{title_status}}` | Title Status | select |
| `{{hoi_status}}` | Insurance Status | select |
| `{{condo_status}}` | Condo Status | select |
| `{{cd_status}}` | CD Status | select |
| `{{package_status}}` | Package Status | select |
| `{{ba_status}}` | BA Status | select |
| `{{epo_status}}` | EPO Status | select |
| `{{mi_status}}` | MI Status | text |
| `{{disclosure_status}}` | Disclosure Status | select |
| `{{loan_status}}` | Loan Status | select |
| `{{pr_type}}` | PR Type | select |

### 11. Notes & Files

| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{notes}}` | Notes | text |
| `{{latest_file_updates}}` | Latest File Updates | text |
| `{{appraisal_notes}}` | Appraisal Notes | text |
| `{{title_notes}}` | Title Notes | text |
| `{{insurance_notes}}` | Insurance Notes | text |
| `{{condo_notes}}` | Condo Notes | text |
| `{{contract_file}}` | Contract File | file |
| `{{initial_approval_file}}` | Initial Approval File | file |
| `{{disc_file}}` | Disclosure File | file |
| `{{appraisal_file}}` | Appraisal File | file |
| `{{title_file}}` | Title File | file |
| `{{insurance_file}}` | Insurance File | file |
| `{{insurance_policy_file}}` | Insurance Policy File | file |
| `{{insurance_inspection_file}}` | Insurance Inspection File | file |
| `{{condo_docs_file}}` | Condo Documents File | file |
| `{{les_file}}` | LES File | file |
| `{{icd_file}}` | ICD File | file |
| `{{fcp_file}}` | FCP File | file |

### 12. Condo Information

| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{condo_name}}` | Condo Name | text |
| `{{condo_approval_type}}` | Approval Type | select |
| `{{condo_status}}` | Condo Status | select |
| `{{condo_notes}}` | Condo Notes | text |
| `{{condo_docs_file}}` | Condo Documents | file |

### 13. System Fields

| Merge Tag | Display Name | Field Type |
|-----------|--------------|------------|
| `{{sender_name}}` | Sender Name | computed |
| `{{sender_email}}` | Sender Email | computed |
| `{{sender_domain}}` | Sender Domain | computed |
| `{{created_at}}` | Created At | datetime |
| `{{updated_at}}` | Updated At | datetime |

---

## Contact Relationship Fields

### How Relationships Work

1. **Buyer's Agent**: Direct relationship via `leads.buyer_agent_id` → `buyer_agents` table
2. **Listing Agent**: Indirect via `lead_external_contacts` (type='listing_agent') → `contacts` table
3. **Lender**: Direct relationship via `leads.approved_lender_id` → `lenders` table
4. **Title Company**: Indirect via `lead_external_contacts` (type='title_company') → `contacts` table
5. **Insurance Provider**: Indirect via `lead_external_contacts` (type='insurance_provider') → `contacts` table

### Available in Different Stages

| Field Group | Available When |
|-------------|----------------|
| Buyer's Agent | Any stage (attached at lead creation) |
| Listing Agent | Active stage only (property under contract) |
| Lender | Any stage (can be assigned anytime) |
| Title Company | Active stage typically |
| Insurance Provider | Active stage typically |

---

## Field Types Reference

| Field Type | Description | Example Format |
|------------|-------------|----------------|
| `text` | Plain text | "John Doe" |
| `number` | Numeric value | 720 |
| `currency` | Money amount | $350,000.00 |
| `percentage` | Percentage value | 3.75% |
| `date` | Date only | January 15, 2025 |
| `datetime` | Date and time | January 15, 2025 at 2:30 PM |
| `boolean` | Yes/No | Yes / No |
| `select` | Dropdown options | "Conventional" |
| `file` | File attachment | File URL |

---

## Implementation Notes

### Phase 1: CRM Fields Addition ✅
- **Added 60+ missing fields** to `crm_fields` table
- All UI-visible fields now have `crm_fields` entries
- Organized into 13 logical sections

### Phase 2: Email Merge Tags ✅
- **Enhanced `send-template-email` edge function** to dynamically query `crm_fields`
- **Added relationship resolvers** for buyer's agent, listing agent, lender, title, insurance
- **100+ merge tags now available** (up from 20)
- Proper formatting for currency, dates, percentages, booleans

### Phase 3: UI Updates ✅
- **Updated Email Template Editor** to show all merge tags categorized
- Buyer's Agent vs. Listing Agent properly separated
- Account Executive fields accessible
- All financial breakdown fields available

### Testing Checklist
- [ ] Verify all 92+ fields appear in Column Visibility
- [ ] Test merge tags in email templates
- [ ] Confirm buyer's agent fields populate correctly
- [ ] Verify listing agent fields only populate in Active stage
- [ ] Test lender/AE fields
- [ ] Validate date/currency formatting in emails
- [ ] Check file field handling

### Future Enhancements
- [ ] Add merge tag preview in template editor
- [ ] Implement conditional merge tags (show/hide based on stage)
- [ ] Add merge tag validation (warn if field is empty)
- [ ] Create email template library with pre-filled merge tags

---

## Support

For questions about field implementation or merge tags, refer to:
- **Code**: `src/pages/admin/EmailTemplates.tsx`
- **Edge Function**: `supabase/functions/send-template-email/index.ts`
- **Database**: `crm_fields` table in Supabase

---

**Document Version**: 1.0  
**Last Updated**: November 6, 2025
