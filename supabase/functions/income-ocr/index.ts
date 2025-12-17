import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Document-specific extraction prompts - Enhanced per BoltCRM Income Calculation Guide
const EXTRACTION_PROMPTS: Record<string, string> = {
  pay_stub: `Extract ALL financial data from this pay stub. Return a JSON object with these exact fields:
{
  "document_type": "pay_stub",
  "employee_name": "Full employee name",
  "employer_name": "Employer/company name",
  "employer_ein": "Employer EIN if visible",
  "pay_period_start": "YYYY-MM-DD format",
  "pay_period_end": "YYYY-MM-DD format",
  "pay_date": "YYYY-MM-DD format",
  "pay_frequency": "weekly|biweekly|semimonthly|monthly",
  "hourly_rate": number or null,
  "regular_hours_current": number,
  "overtime_hours_current": number or 0,
  "gross_current": number (current period gross pay),
  "regular_pay_current": number,
  "overtime_pay_current": number or 0,
  "bonus_current": number or 0,
  "commission_current": number or 0,
  "tips_current": number or 0,
  "other_income_current": number or 0,
  "gross_ytd": number (year-to-date gross),
  "regular_pay_ytd": number,
  "overtime_pay_ytd": number or 0,
  "bonus_ytd": number or 0,
  "commission_ytd": number or 0,
  "tips_ytd": number or 0,
  "hours_ytd": number or null,
  "federal_tax_current": number,
  "federal_tax_ytd": number,
  "state_tax_current": number,
  "state_tax_ytd": number,
  "social_security_current": number,
  "medicare_current": number,
  "net_pay_current": number,
  "extraction_confidence": 0.0-1.0
}
Be precise with numbers. If a field is not visible, use null.`,

  w2: `Extract ALL data from this W-2 form. Return a JSON object with these exact fields:
{
  "document_type": "w2",
  "tax_year": number (4-digit year),
  "employee_name": "Full employee name",
  "employee_ssn_last4": "last 4 digits only",
  "employer_name": "Employer name",
  "employer_ein": "Employer ID number (CRITICAL for cross-referencing)",
  "employer_address": "Full address",
  "box1_wages": number (Wages, tips, other compensation),
  "box2_fed_tax": number (Federal income tax withheld),
  "box3_ss_wages": number (Social security wages),
  "box4_ss_tax": number (Social security tax withheld),
  "box5_medicare_wages": number (Medicare wages and tips),
  "box6_medicare_tax": number (Medicare tax withheld),
  "box7_ss_tips": number or 0,
  "box8_allocated_tips": number or 0,
  "box10_dependent_care": number or 0,
  "box11_nonqualified_plans": number or 0,
  "box12_codes": [{"code": "X", "amount": number}] or [],
  "box12_code_d_401k": number or 0 (Code D - 401k elective deferrals - ADD BACK to income),
  "box12_code_e_403b": number or 0 (Code E - 403b elective deferrals - ADD BACK to income),
  "box12_code_g_457": number or 0 (Code G - 457 plan deferrals),
  "box12_code_s_simple": number or 0 (Code S - SIMPLE contributions),
  "box13_statutory": boolean,
  "box13_retirement": boolean,
  "box13_sick_pay": boolean,
  "box14_other": string or null,
  "extraction_confidence": 0.0-1.0
}
CRITICAL: Extract Box 12 codes D/E/G/S as separate fields - these 401k/403b deferrals get ADDED BACK to qualifying income.`,

  form_1099: `Extract ALL data from this 1099 form. Identify the specific type (1099-NEC, 1099-MISC, etc). Return JSON:
{
  "document_type": "form_1099",
  "form_subtype": "1099-NEC|1099-MISC|1099-INT|1099-DIV|1099-K",
  "tax_year": number,
  "payer_name": "Payer/company name",
  "payer_tin": "TIN if visible",
  "recipient_name": "Recipient name",
  "recipient_tin_last4": "last 4 digits",
  "box1_nonemployee_comp": number or null (1099-NEC),
  "box1_rents": number or null (1099-MISC),
  "box2_royalties": number or null,
  "box3_other_income": number or null,
  "box7_payer_direct_sales": number or null,
  "gross_amount": number (total taxable amount),
  "extraction_confidence": 0.0-1.0
}`,

  form_1040: `Extract key income data from this 1040 tax return. Return JSON:
{
  "document_type": "form_1040",
  "tax_year": number,
  "taxpayer_name": "Primary taxpayer name",
  "spouse_name": "Spouse name or null",
  "filing_status": "single|married_filing_jointly|married_filing_separately|head_of_household",
  "line1_wages": number (Total wages from W-2s),
  "line2a_tax_exempt_interest": number or 0,
  "line2b_taxable_interest": number or 0,
  "line3a_qualified_dividends": number or 0,
  "line3b_ordinary_dividends": number or 0,
  "line4a_ira_distributions": number or 0,
  "line4b_taxable_ira": number or 0,
  "line5a_pensions": number or 0,
  "line5b_taxable_pensions": number or 0,
  "line6a_social_security": number or 0,
  "line6b_taxable_ss": number or 0,
  "line7_capital_gain_loss": number or 0,
  "line8_schedule1_income": number or 0,
  "line9_total_income": number (AGI before adjustments),
  "line11_agi": number (Adjusted Gross Income),
  "schedule_c_attached": boolean,
  "schedule_e_attached": boolean,
  "schedule_f_attached": boolean,
  "extraction_confidence": 0.0-1.0
}`,

  schedule_c: `Extract Schedule C (Sole Proprietor) data. CRITICAL: Also look for Part IV (Vehicle Info) and Part V (Other Expenses). Return JSON:
{
  "document_type": "schedule_c",
  "tax_year": number,
  "business_name": "Business name",
  "business_code": "Principal business code",
  "accounting_method": "cash|accrual",
  "line1_gross_receipts": number,
  "line2_returns_allowances": number or 0,
  "line3_net_receipts": number,
  "line4_cost_of_goods_sold": number or 0,
  "line5_gross_profit": number,
  "line6_other_income": number or 0 (FLAG if this is non-recurring income like lawsuit/insurance),
  "line6_is_non_recurring": boolean (true if line 6 income is one-time, non-recurring),
  "line7_gross_income": number,
  "line8_advertising": number or 0,
  "line9_car_truck": number or 0,
  "line10_commissions": number or 0,
  "line11_contract_labor": number or 0,
  "line12_depletion": number or 0 (ADD-BACK),
  "line13_depreciation": number or 0 (ADD-BACK),
  "line14_employee_benefit": number or 0,
  "line15_insurance": number or 0,
  "line16a_interest_mortgage": number or 0,
  "line16b_interest_other": number or 0,
  "line17_legal_professional": number or 0,
  "line18_office_expense": number or 0,
  "line19_pension_profit_sharing": number or 0,
  "line20a_rent_vehicles": number or 0,
  "line20b_rent_other": number or 0,
  "line21_repairs": number or 0,
  "line22_supplies": number or 0,
  "line23_taxes_licenses": number or 0,
  "line24a_travel": number or 0,
  "line24b_meals": number or 0 (ADD-BACK at 50%),
  "line25_utilities": number or 0,
  "line26_wages": number or 0,
  "line27_other_expenses": number or 0,
  "line28_total_expenses": number,
  "line29_tentative_profit": number,
  "line30_home_office": number or 0 (ADD-BACK),
  "line31_net_profit_loss": number (THIS IS KEY FOR INCOME),
  "line44a_business_miles": number or 0 (Part IV Page 2 - CRITICAL for mileage depreciation add-back),
  "part_v_amortization": number or 0 (Part V - Other expenses amortization - ADD-BACK),
  "part_v_casualty_loss": number or 0 (Part V - Casualty/theft loss - ADD-BACK if non-recurring),
  "extraction_confidence": 0.0-1.0
}

CRITICAL ADD-BACKS per Fannie Mae:
- Line 12 Depletion
- Line 13 Depreciation  
- Line 30 Home Office (Business Use of Home)
- Line 24b Meals at 50%
- Line 44a Business Miles × $0.30/mile (mileage depreciation)
- Part V Amortization
- Part V Casualty Loss (if non-recurring)

CRITICAL DEDUCTION:
- Line 6 Other Income IF it is non-recurring (lawsuit settlement, insurance proceeds, etc.)`,

  schedule_e: `Extract Schedule E (Rental/Partnership) data. CRITICAL: Extract line-by-line rental expenses. Return JSON:
{
  "document_type": "schedule_e",
  "tax_year": number,
  "properties": [
    {
      "address": "Property address",
      "property_type": "single_family|multi_family|vacation|commercial",
      "days_rented": number,
      "personal_use_days": number,
      "line3_rents_received": number (CRITICAL - gross rents),
      "line5_advertising": number or 0,
      "line6_auto_travel": number or 0,
      "line7_cleaning": number or 0,
      "line8_commissions": number or 0,
      "line9_insurance": number or 0 (ADD-BACK for PITIA),
      "line10_legal_professional": number or 0,
      "line11_management_fees": number or 0,
      "line12_mortgage_interest": number or 0 (ADD-BACK for PITIA),
      "line13_other_interest": number or 0,
      "line14_repairs": number or 0,
      "line15_supplies": number or 0,
      "line16_taxes": number or 0 (ADD-BACK for PITIA),
      "line17_utilities": number or 0,
      "line18_depreciation": number or 0 (ADD-BACK),
      "line19_other": number or 0 (includes HOA - ADD-BACK for PITIA),
      "line19_hoa": number or 0 (if HOA fees are itemized),
      "line20_total_expenses": number,
      "line21_net_income_loss": number
    }
  ],
  "total_rental_income": number,
  "total_rental_expenses": number,
  "total_rental_net": number,
  "k1_income_partnerships": number or 0,
  "k1_income_s_corps": number or 0,
  "k1_income_estates_trusts": number or 0,
  "extraction_confidence": 0.0-1.0
}

CRITICAL Schedule E Line-by-Line Add-Backs (PITIA + Depreciation):
- Line 9 Insurance
- Line 12 Mortgage Interest  
- Line 16 Taxes
- Line 18 Depreciation
- Line 19 Other (includes HOA)

These add-backs are needed because Fannie Mae uses a different method than the tax return net income.`,

  k1: `Extract K-1 (Form 1120-S or 1065) data. This is a critical document for S-Corp/partnership income. Return JSON:
{
  "document_type": "k1",
  "form_type": "1120S|1065|1041",
  "tax_year": number,
  "entity_name": "S-Corp or Partnership name",
  "entity_ein": "EIN",
  "partner_shareholder_name": "Shareholder/Partner name",
  "ownership_percentage": number (0-100) - CRITICAL: look for ownership % or stock %,
  "box1_ordinary_income": number (CRITICAL - this is ordinary business income/loss),
  "box2_net_rental_income": number or 0,
  "box3_other_net_rental": number or 0,
  "box4a_guaranteed_payments_services": number or 0 (for partnerships - ADD to qualifying income),
  "box4b_guaranteed_payments_capital": number or 0,
  "box4c_guaranteed_payments_total": number or 0,
  "box5_interest": number or 0,
  "box6_dividends": number or 0,
  "box7_royalties": number or 0,
  "box8_net_short_term_gain": number or 0,
  "box9_net_long_term_gain": number or 0,
  "box10_net_1231_gain": number or 0,
  "box11_other_income": number or 0,
  "box12_section_179": number or 0,
  "box13_other_deductions": number or 0,
  "box14_self_employment": number or 0,
  "box16d_distributions": number or 0 (actual cash distributions to shareholder),
  "extraction_confidence": 0.0-1.0
}

For 1065 K-1s (Partnerships), also need to cross-reference Form 1065 for:
- Lines 16c depreciation
- Line 17 deductions  
- Line 21 total income
- Schedule L Line 16d (short-term loans)
- Schedule M-1 Line 4b (non-deductible expenses)`,

  form_1065: `Extract Form 1065 (Partnership Return) data. CRITICAL for partnership K-1 income calculations. Return JSON:
{
  "document_type": "form_1065",
  "tax_year": number,
  "partnership_name": "Partnership name",
  "ein": "EIN",
  "business_activity_code": "Principal business code",
  "line1a_gross_receipts": number,
  "line2_returns_allowances": number or 0,
  "line3_cost_of_goods_sold": number or 0,
  "line4_gross_profit": number,
  "line5_ordinary_income_other": number or 0,
  "line6_net_farm_profit": number or 0,
  "line7_net_gain_loss_form_4797": number or 0,
  "line8_other_income": number or 0,
  "line9_total_income": number,
  "line16c_depreciation": number or 0 (CRITICAL ADD-BACK),
  "line17_deductions": number or 0,
  "line21_ordinary_business_income": number (flows to K-1),
  "schedule_l_line6_current_assets": number or 0 (for liquidity ratio),
  "schedule_l_line16d_loans_less_1yr": number or 0 (short-term debt - DEDUCT),
  "schedule_l_line18_current_liabilities": number or 0 (for liquidity ratio),
  "schedule_l_line14_inventory": number or 0 (for quick ratio),
  "schedule_m1_line4b_nondeductible_expenses": number or 0 (DEDUCT from income),
  "extraction_confidence": 0.0-1.0
}

CRITICAL for Partnership Income Calculation:
- Add back: Line 16c depreciation, depletion, amortization
- Deduct: Schedule L Line 16d short-term loans
- Deduct: Schedule M-1 Line 4b non-deductible expenses
- Calculate liquidity ratios from Schedule L`,

  form_1120s: `Extract ALL data from this Form 1120-S (S Corporation Tax Return). This is critical for self-employed income calculation. Return JSON:
{
  "document_type": "form_1120s",
  "tax_year": number,
  "corporation_name": "S-Corp name",
  "ein": "EIN",
  "business_activity_code": "Principal business code",
  "accounting_method": "cash|accrual",
  "line1a_gross_receipts": number (Gross receipts or sales),
  "line2_returns_allowances": number or 0,
  "line3_balance": number (Gross profit after COGS),
  "line4_net_gain_loss": number or 0,
  "line5_other_income": number or 0,
  "line6_total_income": number (Sum of 3,4,5),
  "line7_compensation_officers": number (CRITICAL - officer W-2 wages),
  "line8_salaries_wages": number or 0,
  "line9_repairs": number or 0,
  "line10_bad_debts": number or 0,
  "line11_rents": number or 0,
  "line12_taxes_licenses": number or 0,
  "line13_interest": number or 0,
  "line14_depreciation": number (CRITICAL ADD-BACK for qualifying income),
  "line15_depletion": number or 0 (ADD-BACK),
  "line16_advertising": number or 0,
  "line17_pension_profit_sharing": number or 0,
  "line18_employee_benefit": number or 0,
  "line19_other_deductions": number or 0 (includes amortization),
  "line20_total_deductions": number,
  "line21_ordinary_business_income": number (CRITICAL - this flows to K-1 Box 1),
  "schedule_l_line6_current_assets": number or 0 (for liquidity ratio),
  "schedule_l_line14_inventory": number or 0 (for quick ratio),
  "schedule_l_line17d_loans_less_1yr": number or 0 (Mortgages/notes payable <1 year - DEDUCTION),
  "schedule_l_line18_current_liabilities": number or 0 (for liquidity ratio),
  "schedule_m1_line3b_travel_entertainment": number or 0 (Non-deductible T&E - DEDUCTION),
  "schedule_m1_line5_depreciation": number or 0,
  "schedule_m2_line7_distributions": number or 0 (Distributions to shareholders),
  "amortization": number or 0 (Look in Other Deductions detail or Form 4562 - ADD-BACK),
  "net_operating_loss_carryover": number or 0 (ADD-BACK if claimed),
  "extraction_confidence": 0.0-1.0
}

CRITICAL EXTRACTION NOTES per BoltCRM Guide:
- Line 14 Depreciation: Add this back to income (non-cash expense)
- Line 15 Depletion: Add back
- Line 7 Officer Compensation: This is W-2 wages paid to shareholder-employees
- Schedule L Line 17d: Short-term debt that must be DEDUCTED
- Schedule M-1 Line 3b: Non-deductible meals/entertainment to DEDUCT
- Amortization from Form 4562 or Other Deductions: Add back
- If you see Form 4562, extract depreciation and amortization from there`,

  form_1120: `Extract ALL data from this Form 1120 (C Corporation Tax Return). ONLY use if borrower owns 100% of corporation. Return JSON:
{
  "document_type": "form_1120",
  "tax_year": number,
  "corporation_name": "C-Corp name",
  "ein": "EIN",
  "business_activity_code": "Principal business code",
  "accounting_method": "cash|accrual",
  "line1a_gross_receipts": number,
  "line2_returns_allowances": number or 0,
  "line3_cost_of_goods_sold": number or 0,
  "line11_total_income": number,
  "line12_compensation_officers": number (officer W-2 wages),
  "line20_depreciation": number or 0 (ADD-BACK),
  "line21_depletion": number or 0 (ADD-BACK),
  "line26_other_deductions": number or 0 (includes amortization),
  "line28_taxable_income_before_nol": number,
  "line29a_nol_deduction": number or 0 (ADD-BACK),
  "line29b_special_deductions": number or 0,
  "line30_taxable_income": number (START HERE for calculation),
  "line31_total_tax": number (SUBTRACT from income),
  "amortization": number or 0 (from Other Deductions or Form 4562 - ADD-BACK),
  "schedule_l_line6_current_assets": number or 0,
  "schedule_l_line14_inventory": number or 0,
  "schedule_l_line16d_loans_less_1yr": number or 0 (DEDUCT),
  "schedule_l_line18_current_liabilities": number or 0,
  "schedule_m1_line2a_fed_income_tax": number or 0,
  "schedule_m1_line5b_depreciation": number or 0,
  "extraction_confidence": 0.0-1.0
}

C-CORP CALCULATION (100% ownership only):
Start: Line 30 Taxable Income
SUBTRACT: Line 31 Total Tax
ADD-BACK: Line 20 Depreciation
ADD-BACK: Line 21 Depletion  
ADD-BACK: Amortization
ADD-BACK: Line 29a NOL Deduction
DEDUCT: Schedule L Line 16d short-term loans`,

  schedule_f: `Extract Schedule F (Farm Income) data. Return JSON:
{
  "document_type": "schedule_f",
  "tax_year": number,
  "farm_name": "Farm name or description",
  "accounting_method": "cash|accrual",
  "line1a_sales_livestock": number or 0,
  "line1b_cost_basis_livestock": number or 0,
  "line2_sales_produce": number or 0,
  "line3a_coop_distributions": number or 0 (ADD-BACK if deferred),
  "line3b_coop_taxable": number or 0,
  "line4a_ccc_loans": number or 0 (ADD-BACK - Commodity Credit Corp),
  "line4b_ccc_taxable": number or 0,
  "line5a_crop_insurance": number or 0,
  "line5b_crop_insurance_taxable": number or 0,
  "line6a_other_income": number or 0 (ADD-BACK if one-time program payments),
  "line6b_other_income_taxable": number or 0,
  "line7_custom_hire_income": number or 0,
  "line8_other_farm_income": number or 0,
  "line9_gross_income": number,
  "line10_car_truck": number or 0,
  "line11_chemicals": number or 0,
  "line12_conservation": number or 0,
  "line13_custom_hire": number or 0,
  "line14_depreciation": number or 0 (ADD-BACK),
  "line15_employee_benefit": number or 0,
  "line16_feed": number or 0,
  "line17_fertilizers": number or 0,
  "line18_freight": number or 0,
  "line19_gasoline": number or 0,
  "line20_insurance": number or 0,
  "line21a_interest_mortgage": number or 0,
  "line21b_interest_other": number or 0,
  "line22_labor_hired": number or 0,
  "line23_pension_profit_sharing": number or 0,
  "line24a_rent_vehicles": number or 0,
  "line24b_rent_land": number or 0,
  "line25_repairs": number or 0,
  "line26_seeds_plants": number or 0,
  "line27_storage": number or 0,
  "line28_supplies": number or 0,
  "line29_taxes": number or 0,
  "line30_utilities": number or 0,
  "line31_vet_breeding": number or 0,
  "line32_other_expenses": number or 0 (includes amortization/depletion - ADD-BACK),
  "line32_amortization": number or 0 (if itemized),
  "line32_depletion": number or 0 (if itemized),
  "line33_total_expenses": number,
  "line34_net_farm_profit": number (START HERE for calculation),
  "extraction_confidence": 0.0-1.0
}

SCHEDULE F ADD-BACKS:
- Line 3a/4a/6a: Coop distributions, CCC loans, program payments (if deferred)
- Line 14: Depreciation
- Line 32: Amortization and Depletion from Other Expenses`,

  schedule_b: `Extract Schedule B (Interest and Dividends) for self-employment interest income. Return JSON:
{
  "document_type": "schedule_b",
  "tax_year": number,
  "part1_interest_income": [
    {"payer_name": "Bank/institution name", "amount": number}
  ],
  "part1_total_interest": number,
  "part2_dividend_income": [
    {"payer_name": "Company name", "amount": number}
  ],
  "part2_total_dividends": number,
  "part2_qualified_dividends": number or 0,
  "extraction_confidence": 0.0-1.0
}`,

  voe: `Extract Verification of Employment data. Return JSON:
{
  "document_type": "voe",
  "verification_date": "YYYY-MM-DD",
  "employer_name": "Employer name",
  "employer_address": "Full address",
  "employer_phone": "Phone number",
  "employer_ein": "EIN if available",
  "employee_name": "Employee name",
  "employee_title": "Job title/position",
  "employment_start_date": "YYYY-MM-DD",
  "employment_end_date": "YYYY-MM-DD or null if current",
  "is_current_employee": boolean,
  "employment_type": "full_time|part_time|seasonal|contract",
  "pay_frequency": "weekly|biweekly|semimonthly|monthly|annual",
  "base_pay_amount": number,
  "base_pay_period": "hourly|weekly|biweekly|semimonthly|monthly|annual",
  "hours_per_week": number,
  "overtime_eligible": boolean,
  "avg_overtime_hours": number or 0,
  "avg_overtime_amount_ytd": number or 0,
  "avg_bonus_amount_ytd": number or 0,
  "avg_commission_amount_ytd": number or 0,
  "other_income_ytd": number or 0,
  "ytd_earnings": number,
  "prior_year_earnings": number or null,
  "prior_year2_earnings": number or null,
  "probability_of_continued_employment": "good|uncertain|terminating",
  "verifier_name": "Person who completed VOE",
  "verifier_title": "Their title",
  "extraction_confidence": 0.0-1.0
}`,

  default: `Extract all financial and identifying data from this document. Identify the document type first (pay stub, W-2, 1099, tax return, Schedule C, Schedule E, Schedule F, K-1, Form 1065, Form 1120, Form 1120-S, VOE, bank statement, etc.). Return a JSON object with:
{
  "document_type": "identified type",
  "detected_fields": { all extracted field:value pairs },
  "key_income_amounts": [list of income-related amounts found],
  "date_information": { any dates found },
  "extraction_confidence": 0.0-1.0
}`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Store parsed body for potential reuse in error handler
  let parsedBody: { document_id?: string; force_reprocess?: boolean; expected_doc_type?: string } = {};

  try {
    parsedBody = await req.json();
    const { document_id, force_reprocess, expected_doc_type } = parsedBody;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get document info
    const { data: document, error: docError } = await supabaseClient
      .from('income_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Skip if already processed (unless force)
    if (document.ocr_status === 'success' && !force_reprocess) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already processed',
        document_id,
        parsed_json: document.parsed_json
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update status to processing
    await supabaseClient
      .from('income_documents')
      .update({ ocr_status: 'processing' })
      .eq('id', document_id);

    // Get file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('income-docs')
      .download(document.storage_path);

    if (fileError || !fileData) {
      throw new Error('File not found in storage: ' + (fileError?.message || 'Unknown error'));
    }

    // Convert to base64 - using chunked approach to avoid stack overflow on large files
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);

    // Determine which prompt to use
    const docType = expected_doc_type || document.doc_type || 'default';
    const extractionPrompt = EXTRACTION_PROMPTS[docType] || EXTRACTION_PROMPTS.default;

    console.log(`Processing document ${document_id} as type: ${docType}, mime: ${document.mime_type}`);

    // Check if file is an image type supported by OpenAI Vision
    const supportedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const mimeTypeLower = document.mime_type?.toLowerCase() || '';
    const isImage = supportedImageTypes.includes(mimeTypeLower);
    const isPdf = mimeTypeLower === 'application/pdf' || 
                  document.file_name?.toLowerCase().endsWith('.pdf') ||
                  document.storage_path?.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      throw new Error(`Unsupported file type: ${document.mime_type}. Please upload images (PNG, JPG, WEBP, GIF) or PDF files.`);
    }

    let openaiResponse;

    if (isPdf) {
      // For PDFs, use the OpenAI Files API to upload the file first, then use with Assistants/Vision
      console.log('Processing PDF using OpenAI document analysis...');
      
      // Upload the PDF file to OpenAI
      const formData = new FormData();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      formData.append('file', blob, document.file_name || 'document.pdf');
      formData.append('purpose', 'assistants');
      
      const uploadResponse = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        console.error('OpenAI file upload error:', uploadError);
        throw new Error(`Failed to upload PDF to OpenAI: ${uploadResponse.status}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.id;
      console.log('PDF uploaded to OpenAI with file ID:', fileId);
      
      // Use chat completions with file reference for document analysis
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'You are an expert financial document analyzer specializing in income verification for mortgage lending. Extract data precisely and return valid JSON only. Be accurate with numbers - do not round or estimate. If you cannot read a value clearly, use null. Follow Fannie Mae/Freddie Mac income calculation guidelines.'
          }, {
            role: 'user',
            content: [{
              type: 'text',
              text: extractionPrompt
            }, {
              type: 'file',
              file: {
                file_id: fileId
              }
            }]
          }],
          max_tokens: 4000,
          temperature: 0.1
        }),
      });
      
      // Clean up: delete the uploaded file after processing
      try {
        await fetch(`https://api.openai.com/v1/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          },
        });
        console.log('Cleaned up uploaded file:', fileId);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file, will expire automatically:', cleanupError);
      }
    } else {
      // For images, use vision API with base64
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'You are an expert financial document analyzer specializing in income verification for mortgage lending. Extract data precisely and return valid JSON only. Be accurate with numbers - do not round or estimate. If you cannot read a value clearly, use null. Follow Fannie Mae/Freddie Mac income calculation guidelines.'
          }, {
            role: 'user',
            content: [{
              type: 'text',
              text: extractionPrompt
            }, {
              type: 'image_url',
              image_url: {
                url: `data:${document.mime_type};base64,${base64}`,
                detail: 'high'
              }
            }]
          }],
          max_tokens: 4000,
          temperature: 0.1
        }),
      });
    }

    // Handle rate limit errors with retry
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      
      // Check for rate limit (429) error
      if (openaiResponse.status === 429) {
        // Parse retry-after header or use exponential backoff
        const retryAfter = openaiResponse.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 10000; // Default 10 seconds
        
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        
        // Update status to show we're retrying
        await supabaseClient
          .from('income_documents')
          .update({ 
            ocr_status: 'processing',
            parsed_json: { status: 'Rate limited - retrying in a few seconds...' }
          })
          .eq('id', document_id);
        
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry the request
        let retryResponse;
        if (isPdf) {
          // For PDF retry, we need to re-upload the file
          const formData = new FormData();
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          formData.append('file', blob, document.file_name || 'document.pdf');
          formData.append('purpose', 'assistants');
          
          const uploadRetryResponse = await fetch('https://api.openai.com/v1/files', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
            body: formData,
          });
          
          if (!uploadRetryResponse.ok) {
            throw new Error(`OpenAI API error after retry: Rate limit persists`);
          }
          
          const uploadRetryResult = await uploadRetryResponse.json();
          const retryFileId = uploadRetryResult.id;
          
          retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [{
                role: 'system',
                content: 'You are an expert financial document analyzer specializing in income verification for mortgage lending. Extract data precisely and return valid JSON only.'
              }, {
                role: 'user',
                content: [{ type: 'text', text: extractionPrompt }, { type: 'file', file: { file_id: retryFileId } }]
              }],
              max_tokens: 4000,
              temperature: 0.1
            }),
          });
          
          // Cleanup retry file
          try {
            await fetch(`https://api.openai.com/v1/files/${retryFileId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
            });
          } catch (e) { /* ignore */ }
        } else {
          // Image retry
          retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [{
                role: 'system',
                content: 'You are an expert financial document analyzer specializing in income verification for mortgage lending. Extract data precisely and return valid JSON only.'
              }, {
                role: 'user',
                content: [{ type: 'text', text: extractionPrompt }, { type: 'image_url', image_url: { url: `data:${document.mime_type};base64,${base64}`, detail: 'high' } }]
              }],
              max_tokens: 4000,
              temperature: 0.1
            }),
          });
        }
        
        if (!retryResponse || !retryResponse.ok) {
          throw new Error(`OpenAI API error after retry: ${retryResponse?.status || 'unknown'}`);
        }
        
        openaiResponse = retryResponse;
      } else {
        throw new Error(`OpenAI API error: ${openaiResponse.status}`);
      }
    }

    const ocrResult = await openaiResponse.json();
    
    let parsedJson: any = {};
    let confidence = 0.5;
    let detectedDocType = docType;
    
    try {
      const extractedText = ocrResult.choices[0].message.content;
      console.log('Raw OCR response:', extractedText.substring(0, 500));
      
      // Try to extract JSON from the response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
        
        // Get confidence from parsed result or calculate
        confidence = parsedJson.extraction_confidence || 0.8;
        
        // Update detected doc type if returned
        if (parsedJson.document_type) {
          detectedDocType = parsedJson.document_type;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse OCR result as JSON:', parseError);
      parsedJson = { 
        raw_text: ocrResult.choices[0].message.content,
        parse_error: true 
      };
      confidence = 0.3;
    }

    // Extract period dates if available
    let docPeriodStart = null;
    let docPeriodEnd = null;
    if (parsedJson.pay_period_start) docPeriodStart = parsedJson.pay_period_start;
    if (parsedJson.pay_period_end) docPeriodEnd = parsedJson.pay_period_end;

    // Update document with results (tax_year stored in parsed_json, not as separate column)
    const { error: updateError } = await supabaseClient
      .from('income_documents')
      .update({
        ocr_status: 'success',
        parsed_json: parsedJson,
        parse_confidence: confidence,
        doc_type: detectedDocType !== 'default' ? detectedDocType : document.doc_type,
        doc_period_start: docPeriodStart,
        doc_period_end: docPeriodEnd
      })
      .eq('id', document_id);

    if (updateError) {
      console.error('Error updating document:', updateError);
    }

    // Log audit event
    await supabaseClient
      .from('income_audit_events')
      .insert({
        document_id: document_id,
        step: 'ocr',
        payload: {
          ocr_provider: 'openai_gpt4o',
          confidence: confidence,
          detected_doc_type: detectedDocType,
          fields_extracted: Object.keys(parsedJson).length,
          model: 'gpt-4o',
          has_period_dates: !!(docPeriodStart || docPeriodEnd),
          tax_year: parsedJson.tax_year || null
        }
      });

    console.log(`Successfully processed document ${document_id} with confidence ${confidence}`);

    return new Response(JSON.stringify({ 
      success: true, 
      document_id,
      confidence,
      detected_doc_type: detectedDocType,
      fields_extracted: Object.keys(parsedJson).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OCR Error:', error);
    
    // Try to update document status to failed using stored body
    if (parsedBody.document_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseClient
          .from('income_documents')
          .update({ 
            ocr_status: 'failed',
            parsed_json: { error: error.message }
          })
          .eq('id', parsedBody.document_id);
      } catch (e) {
        console.error('Failed to update document status:', e);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
