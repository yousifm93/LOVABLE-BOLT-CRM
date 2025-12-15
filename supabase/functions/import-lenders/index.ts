import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LenderRow {
  lender_name: string;
  lender_type: string;
  initial_approval_date: string | null;
  account_executive: string;
  account_executive_email: string;
  account_executive_phone: string;
  broker_portal_url: string;
  broker_portal_username: string;
  broker_portal_password: string;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
  // Products
  product_bs_loan: string | null;
  product_manufactured_homes: string | null;
  product_fha: string | null;
  product_va: string | null;
  product_coop: string | null;
  product_conv: string | null;
  product_wvoe: string | null;
  product_high_dti: string | null;
  product_condo_hotel: string | null;
  product_dr_loan: string | null;
  product_fn: string | null;
  product_nwc: string | null;
  product_heloc: string | null;
  product_5_8_unit: string | null;
  product_9_plus_unit: string | null;
  product_commercial: string | null;
  product_construction: string | null;
  product_land_loan: string | null;
  product_fthb_dscr: string | null;
  product_jumbo: string | null;
  product_dpa: string | null;
  product_no_income_primary: string | null;
  product_low_fico: string | null;
  product_inv_heloc: string | null;
  product_no_seasoning_cor: string | null;
  product_tbd_uw: string | null;
  product_condo_review_desk: string | null;
  product_condo_mip_issues: string | null;
  product_nonqm_heloc: string | null;
  product_fn_heloc: string | null;
  product_no_credit: string | null;
  product_558: string | null;
  product_itin: string | null;
  product_pl_program: string | null;
  product_1099_program: string | null;
  product_wvoe_family: string | null;
  product_1099_less_1yr: string | null;
  product_1099_no_biz: string | null;
  product_omit_student_loans: string | null;
  product_no_ratio_dscr: string | null;
  // Clauses
  title_clause: string | null;
  insurance_clause: string | null;
  // Numbers
  condotel_min_sqft: number | null;
  asset_dep_months: number | null;
  min_fico: number | null;
  min_sqft: number | null;
  heloc_min_fico: number | null;
  heloc_min: number | null;
  max_cash_out_70_ltv: number | null;
  // LTVs
  heloc_max_ltv: number | null;
  fn_max_ltv: number | null;
  bs_loan_max_ltv: number | null;
  ltv_1099: number | null;
  pl_max_ltv: number | null;
  condo_inv_max_ltv: number | null;
  jumbo_max_ltv: number | null;
  wvoe_max_ltv: number | null;
  dscr_max_ltv: number | null;
  fha_max_ltv: number | null;
  conv_max_ltv: number | null;
  max_ltv: number | null;
  // Other
  epo_period: string | null;
  renewed_on: string | null;
}

function cleanYNTBD(val: string | null | undefined): string | null {
  if (!val) return null;
  const v = val.toString().trim().toUpperCase();
  if (v === 'Y' || v === 'YES') return 'Y';
  if (v === 'N' || v === 'NO') return 'N';
  if (v === 'TBD') return 'TBD';
  return null;
}

function cleanNumber(val: string | null | undefined): number | null {
  if (!val) return null;
  const cleaned = val.toString().replace(/[$,\s%]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function cleanDate(val: string | null | undefined): string | null {
  if (!val) return null;
  try {
    // Handle various date formats
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function cleanPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = phone.toString().replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
  }
  return phone.toString().trim() || null;
}

function cleanText(val: string | null | undefined): string | null {
  if (!val) return null;
  const text = val.toString().trim();
  return text || null;
}

// RFC 4180 compliant CSV parser that handles multi-line quoted fields
function parseCSV(csvText: string): Record<string, string>[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote ("") - add single quote and skip next
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field (only when not in quotes)
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row (only when not in quotes)
      if (char === '\r' && nextChar === '\n') i++; // Handle CRLF
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }
  
  // Handle last row if no trailing newline
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f)) rows.push(currentRow);
  }
  
  if (rows.length < 2) return [];
  
  // Convert to objects using first row as headers
  const headers = rows[0];
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    headers.forEach((header, idx) => {
      obj[header] = row[idx] || '';
    });
    return obj;
  });
}

// Validate if a row looks like a valid lender (not an address fragment)
function isValidLenderRow(row: Record<string, string>): boolean {
  const name = row['Name']?.trim() || '';
  if (!name) return false;
  
  // Skip rows where name looks like an address
  if (/^\d+\s/.test(name)) return false; // Starts with numbers (address)
  if (/^P\.?O\.?\s*BOX/i.test(name)) return false; // PO Box
  if (/^SUITE\s/i.test(name)) return false; // Suite number
  if (/^#\d+/.test(name)) return false; // Unit number
  if (/^\w+,\s*[A-Z]{2}\s+\d{5}/.test(name)) return false; // City, ST ZIP
  if (name.length < 2) return false; // Too short
  
  return true;
}

function mapRowToLender(row: Record<string, string>): Partial<LenderRow> {
  const firstName = cleanText(row['FIRST NAME']);
  const lastName = cleanText(row['LAST NAME']);
  const accountExec = [firstName, lastName].filter(Boolean).join(' ');
  
  return {
    lender_name: cleanText(row['Name']) || '',
    lender_type: cleanText(row['LENDER TYPE']) || 'Conventional',
    initial_approval_date: cleanDate(row['INITIAL APPROVAL ON']),
    account_executive: accountExec || null,
    account_executive_email: cleanText(row['AE EMAIL']),
    account_executive_phone: cleanPhone(row['AE PHONE']),
    broker_portal_url: cleanText(row['BROKER PORTAL']),
    broker_portal_username: cleanText(row['USERNAME']),
    broker_portal_password: cleanText(row['PASSWORD']),
    min_loan_amount: cleanNumber(row['MIN LOAN AMT']),
    max_loan_amount: cleanNumber(row['MAX LOAN AMT']),
    // Products
    product_bs_loan: cleanYNTBD(row['BS LOAN INCOME CALC']),
    product_manufactured_homes: cleanYNTBD(row['MANUFACTURED HOMES']),
    product_fha: cleanYNTBD(row['FHA']),
    product_va: cleanYNTBD(row['VA']),
    product_coop: cleanYNTBD(row['CO-OP']),
    product_conv: cleanYNTBD(row['CONV']),
    product_wvoe: cleanYNTBD(row['WVOE LOAN']),
    product_high_dti: cleanYNTBD(row['HIGH DTI']),
    product_condo_hotel: cleanYNTBD(row['CONDO HOTEL']),
    product_dr_loan: cleanYNTBD(row['DR LOAN']),
    product_fn: cleanYNTBD(row['FN']),
    product_nwc: cleanYNTBD(row['NWC']),
    product_heloc: cleanYNTBD(row['HELOC']),
    product_5_8_unit: cleanYNTBD(row['5-8 UNIT']),
    product_9_plus_unit: cleanYNTBD(row['9+ UNITS']),
    product_commercial: cleanYNTBD(row['COMMERCIAL']),
    product_construction: cleanYNTBD(row['CONSTRUCTION']),
    product_land_loan: cleanYNTBD(row['LAND LOAN']),
    product_fthb_dscr: cleanYNTBD(row['FTHB DSCR']),
    product_jumbo: cleanYNTBD(row['JUMBO']),
    product_dpa: cleanYNTBD(row['DPA']),
    product_no_income_primary: cleanYNTBD(row['NO INCOME PRIMARY']),
    product_low_fico: cleanYNTBD(row['LOW FICO']),
    product_inv_heloc: cleanYNTBD(row['INV HELOC']),
    product_no_seasoning_cor: cleanYNTBD(row['NO SEASONING COR']),
    product_tbd_uw: cleanYNTBD(row['TBD UW']),
    product_condo_review_desk: cleanYNTBD(row['CONDO REVIEW DESK']),
    product_condo_mip_issues: cleanYNTBD(row['CONDO MIP ISSUES']),
    product_nonqm_heloc: cleanYNTBD(row['NON-QM HELOC']),
    product_fn_heloc: cleanYNTBD(row['FN HELOC']),
    product_no_credit: cleanYNTBD(row['NO CREDIT']),
    product_558: cleanYNTBD(row['558?']),
    product_itin: cleanYNTBD(row['ITIN']),
    product_pl_program: cleanYNTBD(row['P&L PROGRAM']),
    product_1099_program: cleanYNTBD(row['1099 PROGRAM']),
    product_wvoe_family: cleanYNTBD(row['WVOE - WORK FOR FAMILY']),
    product_1099_less_1yr: cleanYNTBD(row['1099 <1YR']),
    product_1099_no_biz: cleanYNTBD(row['1099 NO BIZ OWNERSHIP']),
    product_omit_student_loans: cleanYNTBD(row['OMIT STUDENT LOANS?']),
    product_no_ratio_dscr: cleanYNTBD(row['NO RATIO DSCR']),
    // Clauses - replace <br/> with newlines
    title_clause: cleanText(row['TITLE CLAUSE'])?.replace(/<br\/?>/gi, '\n'),
    insurance_clause: cleanText(row['INSURANCE CLAUSE'])?.replace(/<br\/?>/gi, '\n'),
    // Numbers
    condotel_min_sqft: cleanNumber(row['Condotel min Sqft']),
    asset_dep_months: cleanNumber(row['ASSET DEP (MONTHS)']),
    min_fico: cleanNumber(row['MIN FICO']),
    min_sqft: cleanNumber(row['MIN SQFT']),
    heloc_min_fico: cleanNumber(row['HELOC MIN FICO']),
    heloc_min: cleanNumber(row['HELOC MIN']),
    max_cash_out_70_ltv: cleanNumber(row['MAX CASH OUT >70% LTV']),
    // LTVs
    heloc_max_ltv: cleanNumber(row['HELOC MAX LTV']),
    fn_max_ltv: cleanNumber(row['FN MAX LTV']),
    bs_loan_max_ltv: cleanNumber(row['BS LOAN MAX LTV']),
    ltv_1099: cleanNumber(row['1099 MAX LTV']),
    pl_max_ltv: cleanNumber(row['P&L MAX LTV']),
    condo_inv_max_ltv: cleanNumber(row['CONDO INV MAX LTV (NO RESERVES)']),
    jumbo_max_ltv: cleanNumber(row['JUMBO MAX LTV']),
    wvoe_max_ltv: cleanNumber(row['WVOE MAX LTV']),
    dscr_max_ltv: cleanNumber(row['DSCR MAX LTV']),
    fha_max_ltv: cleanNumber(row['FHA MAX LTV']),
    conv_max_ltv: cleanNumber(row['CONV MAX LTV']),
    max_ltv: cleanNumber(row['MAX LTV']),
    // Other
    epo_period: cleanText(row['EPO PERIOD']),
    renewed_on: cleanDate(row['RENEWED ON']),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { csvData, csvUrl } = await req.json();
    
    let rawCsv = csvData;
    if (!rawCsv && csvUrl) {
      const response = await fetch(csvUrl);
      rawCsv = await response.text();
    }

    if (!rawCsv) {
      return new Response(
        JSON.stringify({ error: "No CSV data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Parsing CSV data...");
    const rows = parseCSV(rawCsv);
    console.log(`Parsed ${rows.length} rows from CSV`);

    // Get existing lenders
    const { data: existingLenders, error: fetchError } = await supabase
      .from('lenders')
      .select('id, lender_name');
    
    if (fetchError) throw fetchError;

    const lenderMap = new Map(
      (existingLenders || []).map(l => [l.lender_name?.toUpperCase().trim(), l.id])
    );

    let updated = 0;
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      // Skip invalid rows (address fragments from multi-line fields)
      if (!isValidLenderRow(row)) {
        console.log(`Skipping invalid row: ${row['Name'] || '(empty)'}`);
        skipped++;
        continue;
      }
      
      const lenderData = mapRowToLender(row);
      
      if (!lenderData.lender_name) {
        skipped++;
        continue;
      }

      const existingId = lenderMap.get(lenderData.lender_name.toUpperCase().trim());

      try {
        if (existingId) {
          // Update existing lender
          const { error: updateError } = await supabase
            .from('lenders')
            .update(lenderData)
            .eq('id', existingId);
          
          if (updateError) throw updateError;
          updated++;
          console.log(`Updated lender: ${lenderData.lender_name}`);
        } else {
          // Create new lender
          const { error: insertError } = await supabase
            .from('lenders')
            .insert({
              ...lenderData,
              status: 'active'
            });
          
          if (insertError) throw insertError;
          created++;
          console.log(`Created lender: ${lenderData.lender_name}`);
        }
      } catch (err) {
        errors.push(`${lenderData.lender_name}: ${err.message}`);
        console.error(`Error processing ${lenderData.lender_name}:`, err);
      }
    }

    const result = {
      success: true,
      summary: {
        total: rows.length,
        updated,
        created,
        skipped,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    };

    console.log("Import complete:", result.summary);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
