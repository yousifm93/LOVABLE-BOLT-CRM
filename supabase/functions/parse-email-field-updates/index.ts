import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Field definitions with display names and valid values (TITLE CASE for select values)
const FIELD_DEFINITIONS: Record<string, { displayName: string; type: string; validValues?: string[] }> = {
  loan_status: {
    displayName: 'Loan Status',
    type: 'select',
    validValues: ['New', 'RFP', 'SUB', 'AWC', 'CTC', 'CLOSED', 'Needs Support'],
  },
  appraisal_status: {
    displayName: 'Appraisal Status',
    type: 'select',
    validValues: ['Ordered', 'Scheduled', 'Inspected', 'Received', 'Waiver', 'Transfer'],
  },
  title_status: {
    displayName: 'Title Status',
    type: 'select',
    validValues: ['Ordered', 'Received', 'Cleared'],
  },
  hoi_status: {
    displayName: 'Insurance Status',
    type: 'select',
    validValues: ['Quoted', 'Ordered', 'Bound'],
  },
  condo_status: {
    displayName: 'Condo Status',
    type: 'select',
    validValues: ['Ordered', 'Received', 'Approved', 'Waived'],
  },
  disclosure_status: {
    displayName: 'Disclosure Status',
    type: 'select',
    validValues: ['Not Started', 'Sent', 'Signed'],
  },
  cd_status: {
    displayName: 'CD Status',
    type: 'select',
    validValues: ['N/A', 'Requested', 'Sent', 'Signed'],
  },
  package_status: {
    displayName: 'Package Status',
    type: 'select',
    validValues: ['Initial', 'Final'],
  },
  epo_status: {
    displayName: 'EPO Status',
    type: 'select',
    validValues: ['Not Started', 'Sent'],
  },
  interest_rate: {
    displayName: 'Interest Rate',
    type: 'number',
  },
  lock_expiration_date: {
    displayName: 'Lock Expiration Date',
    type: 'date',
  },
  close_date: {
    displayName: 'Closing Date',
    type: 'date',
  },
  discount_points: {
    displayName: 'Discount Points',
    type: 'number',
  },
  loan_amount: {
    displayName: 'Loan Amount',
    type: 'currency',
  },
  sales_price: {
    displayName: 'Sales Price',
    type: 'currency',
  },
  appraisal_value: {
    displayName: 'Appraisal Value',
    type: 'currency',
  },
  // Rate lock confirmation fields
  loan_program: {
    displayName: 'Loan Program',
    type: 'select',
    validValues: ['Conventional', 'FHA', 'VA', 'DSCR', 'Jumbo', 'USDA', 'Bank Statement'],
  },
  property_type: {
    displayName: 'Property Type',
    type: 'select',
    validValues: ['Single Family', 'Townhouse', 'Condo', 'Multi-Family', '2-4 Unit', 'PUD'],
  },
  // NOTE: LTV, DTI, and PITI Total are CALCULATED fields - never parse from emails
  // ltv = loan_amount / MIN(sales_price, appraisal_value)
  // dti = calculated debt-to-income ratio
  // piti_total = sum of P&I + taxes + insurance + MI + HOA
  
  dscr_ratio: {
    displayName: 'DSCR Ratio',
    type: 'number',
  },
  fico_score: {
    displayName: 'FICO Score',
    type: 'number',
  },
  term: {
    displayName: 'Loan Term (months)',
    type: 'number',
  },
  prepayment_penalty: {
    displayName: 'Prepayment Penalty (years)',
    type: 'number',
  },
  escrow: {
    displayName: 'Escrow',
    type: 'select',
    validValues: ['Yes', 'No'],
  },
  // Additional fields for comprehensive email parsing
  occupancy: {
    displayName: 'Occupancy',
    type: 'select',
    validValues: ['Primary', 'Second Home', 'Investment'],
  },
  loan_type: {
    displayName: 'Transaction Type',
    type: 'select',
    validValues: ['Purchase', 'Refinance', 'HELOC'],
  },
  total_monthly_income: {
    displayName: 'Total Monthly Income',
    type: 'currency',
  },
  homeowners_insurance: {
    displayName: 'Monthly Insurance',
    type: 'currency',
  },
  property_taxes: {
    displayName: 'Monthly Taxes',
    type: 'currency',
  },
  cash_to_close: {
    displayName: 'Cash to Close',
    type: 'currency',
  },
  appr_date_time: {
    displayName: 'Appraisal Date/Time',
    type: 'datetime',
  },
};

// Status progression rules - a status cannot go backwards in its progression
const STATUS_PROGRESSIONS: Record<string, string[]> = {
  appraisal_status: ['Ordered', 'Scheduled', 'Inspected', 'Received'],
  package_status: ['Initial', 'Final'],
  title_status: ['Ordered', 'Received', 'Cleared'],
  cd_status: ['N/A', 'Requested', 'Sent', 'Signed'],
  disclosure_status: ['Not Started', 'Sent', 'Signed'],
  hoi_status: ['Quoted', 'Ordered', 'Bound'],
  condo_status: ['Ordered', 'Received', 'Approved'],
  loan_status: ['New', 'RFP', 'SUB', 'AWC', 'CTC', 'CLOSED'],
};

// Field name mapping: AI uses friendly names, database uses actual column names
const FIELD_NAME_MAP: Record<string, string> = {
  'loan_program': 'program',
  'monthly_taxes': 'property_taxes',
  'monthly_insurance': 'homeowners_insurance',
  'insurance_amount': 'homeowners_insurance',
  'transaction_type': 'loan_type',
  'escrow': 'escrows',
  'appraisal_date_time': 'appr_date_time',
};

// Fields that are calculated and should NEVER be suggested for update
const CALCULATED_FIELDS = ['ltv', 'piti_total', 'dti'];

// Helper to normalize values for comparison
function normalizeValue(value: any, type: string): string {
  if (value === null || value === undefined) return '';
  
  const strValue = String(value).trim();
  
  if (type === 'date') {
    // Normalize dates to YYYY-MM-DD
    return strValue.substring(0, 10);
  }
  
  if (type === 'number' || type === 'currency') {
    // Remove currency symbols and normalize numbers
    const num = parseFloat(strValue.replace(/[$,%]/g, ''));
    return isNaN(num) ? '' : num.toString();
  }
  
  // String/select - case-insensitive comparison
  return strValue.toLowerCase();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, htmlBody, leadId, currentLeadData } = await req.json();
    
    if (!subject && !body) {
      return new Response(JSON.stringify({ suggestions: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[parse-email-field-updates] LOVABLE_API_KEY not configured');
      return new Response(JSON.stringify({ suggestions: [], error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build field list for AI prompt
    const fieldList = Object.entries(FIELD_DEFINITIONS).map(([key, def]) => {
      let fieldDesc = `- ${key} (${def.displayName}): ${def.type}`;
      if ('validValues' in def && def.validValues) {
        fieldDesc += ` - valid values: ${def.validValues.join(', ')}`;
      }
      return fieldDesc;
    }).join('\n');

    // Build current values context
    const currentValuesContext = currentLeadData ? Object.entries(currentLeadData)
      .filter(([key]) => key in FIELD_DEFINITIONS)
      .map(([key, value]) => `${key}: ${value || 'null'}`)
      .join('\n') : 'No current data available';

    const systemPrompt = `You are an AI assistant that analyzes mortgage-related emails to detect status updates and field changes for a CRM system.

Your task is to identify any information in the email that suggests a CRM field should be updated.

AVAILABLE CRM FIELDS:
${fieldList}

CURRENT LEAD VALUES:
${currentValuesContext}

CRITICAL DOMAIN-SPECIFIC RULES:

1. **INTERNAL EMAILS**: If the email is FROM an @mortgagebolt.com address, return an empty array []. Do not suggest updates for internal team emails.

2. **APPRAISAL CODE "1073"**: The code "1073" in an email refers to an APPRAISAL form (it's the appraisal form code). If you see "1073" being ordered or scheduled, suggest appraisal_status update, NOT condo_status.

3. **CONDO vs APPRAISAL - COMPLETELY SEPARATE PROCESSES**:
   - APPRAISAL: Physical property inspection to determine value. Keywords: 1073, inspection, appraisal order, appraiser visit, appraisal scheduled, appraisal inspection
   - CONDO: Condo association documentation/questionnaire for condo approval. Keywords: condo questionnaire, condo docs, HOA docs, condo approval, condo cert
   - These are NEVER related. An appraisal email should NEVER trigger condo_status changes and vice versa.
   - If you see "1073" - this is APPRAISAL, not condo
   - Condo documents are for condo association approval, appraisal is for property valuation

4. **APPRAISAL SCHEDULING EMAILS - ALWAYS EXTRACT DATE/TIME (CRITICAL)**:
   - When an appraisal is scheduled, ALWAYS extract BOTH fields together:
     - appraisal_status → "Scheduled"
     - appr_date_time → The actual date and time (convert to ISO datetime format: YYYY-MM-DDTHH:MM:SS)
   - Look for phrases like: "scheduled for", "inspection on", "appointment at", "inspection is scheduled"
   
   **CRITICAL DATE PARSING RULES:**
   - Use the CURRENT YEAR (2025) unless explicitly stated otherwise
   - Extract the EXACT date mentioned - do NOT shift, calculate, or modify dates
   - Day of week is just context - extract the actual date (e.g., "Tuesday, December 16" → December 16, ignore that it's Tuesday)
   - Month names: January=01, February=02, March=03, April=04, May=05, June=06, July=07, August=08, September=09, October=10, November=11, December=12
   - Convert 12-hour time to 24-hour: 9:30AM → 09:30, 4:30PM → 16:30, 12:00PM → 12:00, 12:00AM → 00:00
   - If no year is specified, assume 2025
   - Ignore timezone abbreviations (EST, CST, etc.) - just extract the time as stated
   
   **EXAMPLES - FOLLOW EXACTLY:**
   - "Tuesday, December 16, 2025 9:30AM EST" → "2025-12-16T09:30:00"
   - "December 16th at 9:30 AM" → "2025-12-16T09:30:00"
   - "12/16/2025 at 9:30am" → "2025-12-16T09:30:00"
   - "Monday, January 6th, 2025 at 2:00 PM" → "2025-01-06T14:00:00"
   - "inspection scheduled for Dec 19 at 4:30pm" → "2025-12-19T16:30:00"
   
   **COMMON MISTAKES TO AVOID:**
   - DO NOT change "December 16" to "December 19" - extract the exact date
   - DO NOT change "9:30 AM" to "4:30 AM" - extract the exact time
   - DO NOT shift dates based on day of week - if it says "December 16", use December 16
   
   - The appr_date_time field MUST be populated alongside appraisal_status when changing to "Scheduled"

5. **WIRE AMOUNTS**: Wire transfer amounts do NOT indicate loan_amount changes. Only suggest loan_amount changes if the email explicitly states "new loan amount", "loan amount changed", or similar phrasing that clearly indicates the loan amount itself is being modified.

6. **STATUS PROGRESSION - NEVER DOWNGRADE**: Never suggest a status that is EARLIER in the workflow than the current value. Status progressions are:
   - Appraisal: Ordered → Scheduled → Inspected → Received (if current is "Inspected", never suggest "Ordered" or "Scheduled")
   - Package: Initial → Final (if current is "Final", never suggest "Initial")
   - Title: Ordered → Received → Cleared
   - CD: N/A → Requested → Sent → Signed
   - Insurance (HOI): Quoted → Ordered → Bound
   - Condo: Ordered → Received → Approved

7. **PACKAGE STATUS MAPPING**: 
   - "in progress", "started", "beginning" → suggest "Initial"
   - "final", "complete", "finished", "closing package" → suggest "Final"
   - NEVER suggest "Completed" or "In Progress" as these are NOT valid values

8. **CD vs PACKAGE - CRITICAL DISTINCTION**:
   - **cd_status (Initial Closing Disclosure)**: The CD is sent when the file is ALMOST at the finish line but not quite. Look for: "CD sent", "Initial Closing Disclosure", "Closing Disclosure sent", "CD for review"
   - **package_status (Final Closing Package)**: The Package is the FINAL closing package that the title company works on with the broker's closing department. Look for: "Closing package sent", "Final package", "Documents sent to settlement agent", "Closing docs ready", "Package for signing"
   - These are DIFFERENT fields - do NOT confuse them!
   - If email mentions "closing package" or "documents to title/settlement" → package_status
   - If email mentions "CD" or "closing disclosure" specifically → cd_status

9. **CLOSING DATE CONFIRMATION**: Only suggest close_date if the email explicitly confirms a closing date (e.g., "closing on 12/12", "scheduled to close"). Do not change close_date based on estimated or tentative dates.

10. **TITLE CASE FOR STATUS VALUES**: All status field values should use Title Case (e.g., "Ordered", "Received", "Scheduled"), not UPPERCASE.

11. **RATE LOCK CONFIRMATION EMAILS**: These emails contain extremely valuable structured data. Look for:
   - Subject containing "Lock Confirmation" or "Rate Lock"
   - Tabular data with fields like: Interest Rate, Note Rate, Points, Program, Property Type, DSCR, FICO, Lock Expiration
   - Parse ALL available fields: interest_rate, discount_points, loan_program, property_type, dscr_ratio, fico_score, lock_expiration_date, loan_amount, term, prepayment_penalty, escrow, occupancy, total_monthly_income, insurance_amount, monthly_taxes, cash_to_close, appraisal_value, close_date
   - **NEVER** parse LTV, DTI, or PITI Total - these are calculated fields
   - For rate lock emails from automated lender systems, use confidence 1.0 (100%)
   - Match program names: "DSCR" → "DSCR", "Conv" or "Conventional" → "Conventional", "FHA" → "FHA"
   - Property types: "SFR" or "Single Family" → "Single Family", "Condo" or "Condominium" → "Condo", "Townhouse" → "Townhouse"

12. **CONDITIONS UPDATE EMAILS (e.g., from PennyMac, eThinkHawaiian)**: These contain detailed loan summary data in tabular format. Extract ALL fields:
   - "Note Rate" or "Interest Rate" → interest_rate
   - "Loan Amount" → loan_amount
   - "Total Monthly Income" or "Monthly Income" → total_monthly_income
   - "Insurance" or "Hazard Insurance" → insurance_amount
   - "Lock Expiration" or "Lock Exp" → lock_expiration_date
   - "Occupancy" → occupancy (map to "Primary", "Second Home", or "Investment")
   - "Appraised Value" or "Appraisal Value" → appraisal_value
   - "Term" or "Amortization" → term (convert years to months: 30yr = 360)
   - "Est. Monthly Taxes" or "Property Taxes" → monthly_taxes
   - "Impounds" or "Escrow" → escrow ("Yes" or "No", "Not Waived" = "Yes", "Waived" = "No")
   - "Est. Cash to Close" or "Cash to Close" → cash_to_close
   - "Est. Closing Date" or "Closing Date" → close_date (only if confirmed, not tentative)
   - **NEVER** suggest changes to LTV, DTI, or PITI Total - these are CALCULATED fields
   - For automated lender condition emails, use confidence 0.95-1.0

13. **CALCULATED FIELDS - NEVER SUGGEST**:
   - **ltv** (Loan-to-Value): Calculated from loan_amount / MIN(sales_price, appraisal_value)
   - **dti** (Debt-to-Income): Calculated from total monthly debts / total monthly income
   - **piti_total** (Total Monthly Payment): Calculated as sum of P&I + taxes + insurance + MI + HOA
   - These fields are AUTO-CALCULATED in the CRM. Do NOT return suggestions for them.

14. **CONFIDENCE SCORING**:
    - 1.0 (100%): Automated lender emails with clear structured data (rate locks, package confirmations from noreply@ addresses)
    - 0.9-0.95: Clear status updates with explicit keywords ("Clear to Close", "Appraisal Received")
    - 0.7-0.85: Implied updates requiring interpretation
    - Below 0.7: Uncertain or ambiguous

15. **OCCUPANCY MAPPING**:
    - "Primary", "Primary Residence", "Owner Occupied", "Primary Home" → "Primary"
    - "Second Home", "Vacation Home" → "Second Home"
    - "Investment", "Non-Owner Occupied", "Rental" → "Investment"

16. **TRANSACTION TYPE MAPPING**:
    - "Purchase", "Buy" → "Purchase"
    - "Refinance", "Refi", "Rate/Term" → "Refinance"
    - "HELOC", "Home Equity" → "HELOC"

INSTRUCTIONS:
1. Analyze the email subject and body for any status updates or field changes
2. Look for phrases like "clear to close", "CTC", "appraisal received", "rate locked", "closing date confirmed", etc.
3. Only suggest changes that are CLEARLY indicated in the email
4. For dates, use YYYY-MM-DD format
5. For numbers/currency, use plain numbers (no $ or % symbols)
6. Be conservative - only suggest updates you're confident about
7. Don't suggest changes if the current value already matches what the email indicates
8. VALIDATE against current values to avoid downgrading statuses
9. For rate lock confirmation emails, extract ALL available data points
10. For condition update emails with detailed loan info, extract ALL financial fields

Return a JSON array of suggestions. Each suggestion should have:
- field_name: the database field name
- field_display_name: human-readable name
- suggested_value: the new value to set (must be from valid values for select fields)
- reason: brief explanation of why (1-2 sentences)
- confidence: number 0.0-1.0

Example response:
[
  {
    "field_name": "loan_status",
    "field_display_name": "Loan Status",
    "suggested_value": "CTC",
    "reason": "Email indicates the loan has been cleared to close.",
    "confidence": 0.95
  }
]

If no updates are detected, return an empty array: []`;

    const userPrompt = `Subject: ${subject || '(no subject)'}

Email Body:
${body || htmlBody || '(no content)'}

Analyze this email and identify any CRM field updates that should be made.`;

    console.log('[parse-email-field-updates] Analyzing email for field updates...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-email-field-updates] AI Gateway error:', response.status, errorText);
      return new Response(JSON.stringify({ suggestions: [], error: 'AI Gateway error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    console.log('[parse-email-field-updates] AI response:', content);

    // Parse the JSON response
    let suggestions = [];
    try {
      // Clean up potential markdown formatting
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      suggestions = JSON.parse(cleanContent);
      
      // Validate suggestions and filter out calculated fields
      suggestions = suggestions.filter((s: any) => {
        // Filter out calculated fields (LTV, DTI, PITI Total)
        if (CALCULATED_FIELDS.includes(s.field_name)) {
          console.log(`[parse-email-field-updates] Skipping calculated field: ${s.field_name}`);
          return false;
        }
        return s.field_name && 
               s.suggested_value && 
               s.reason &&
               (s.field_name in FIELD_DEFINITIONS || FIELD_NAME_MAP[s.field_name]);
      });

      // Map field names to actual database column names and add display names
      suggestions = suggestions.map((s: any) => {
        const mappedFieldName = FIELD_NAME_MAP[s.field_name] || s.field_name;
        const fieldDef = FIELD_DEFINITIONS[s.field_name as keyof typeof FIELD_DEFINITIONS];
        
        // Map escrow values: Yes = NOT WAIVED, No = WAIVED
        let suggestedValue = s.suggested_value;
        if (s.field_name === 'escrow') {
          if (suggestedValue.toLowerCase() === 'yes' || suggestedValue.toLowerCase() === 'escrowed' || suggestedValue.toLowerCase() === 'not waived') {
            suggestedValue = 'Yes';
          } else if (suggestedValue.toLowerCase() === 'no' || suggestedValue.toLowerCase() === 'waived') {
            suggestedValue = 'No';
          }
        }
        
        return {
          ...s,
          field_name: mappedFieldName,
          suggested_value: suggestedValue,
          field_display_name: s.field_display_name || fieldDef?.displayName || s.field_name,
          confidence: s.confidence || 0.8,
        };
      });

      // CRITICAL: Filter out suggestions where value already matches current value
      suggestions = suggestions.filter((s: any) => {
        const fieldName = s.field_name;
        const def = FIELD_DEFINITIONS[fieldName];
        
        if (!def || !currentLeadData) return true;
        
        const currentValue = currentLeadData[fieldName];
        const suggestedValue = s.suggested_value;
        
        // If current value is null/undefined, suggestion is valid
        if (currentValue === null || currentValue === undefined || currentValue === '') {
          return true;
        }
        
        // Normalize and compare values
        const normalizedCurrent = normalizeValue(currentValue, def.type);
        const normalizedSuggested = normalizeValue(suggestedValue, def.type);
        
        if (normalizedCurrent === normalizedSuggested) {
          console.log(`[parse-email-field-updates] Skipping identical value: ${fieldName} is already "${currentValue}"`);
          return false;
        }
        
        return true;
      });

      // CRITICAL: Validate status progression - filter out downgrades
      suggestions = suggestions.filter((s: any) => {
        const fieldName = s.field_name;
        
        // Check if this field has a status progression
        if (fieldName in STATUS_PROGRESSIONS && currentLeadData) {
          const progression = STATUS_PROGRESSIONS[fieldName];
          const currentValue = currentLeadData[fieldName];
          const suggestedValue = s.suggested_value;
          
          // Find indices in progression
          const currentIndex = progression.findIndex(
            (v: string) => v.toLowerCase() === (currentValue?.toLowerCase() || '')
          );
          const suggestedIndex = progression.findIndex(
            (v: string) => v.toLowerCase() === suggestedValue.toLowerCase()
          );
          
          // If both values are in the progression and suggested is earlier, reject
          if (currentIndex !== -1 && suggestedIndex !== -1 && suggestedIndex < currentIndex) {
            console.log(`[parse-email-field-updates] Rejecting downgrade: ${fieldName} from "${currentValue}" to "${suggestedValue}"`);
            return false;
          }
        }
        
        return true;
      });

    } catch (parseError) {
      console.error('[parse-email-field-updates] Error parsing AI response:', parseError);
      suggestions = [];
    }

    console.log('[parse-email-field-updates] Detected suggestions after validation:', suggestions.length);

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[parse-email-field-updates] Error:', error);
    return new Response(JSON.stringify({ suggestions: [], error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});