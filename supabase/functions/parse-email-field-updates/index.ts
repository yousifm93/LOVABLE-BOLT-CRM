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
  ltv: {
    displayName: 'LTV',
    type: 'number',
  },
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
    validValues: ['Primary Home', 'Second Home', 'Investment'],
  },
  transaction_type: {
    displayName: 'Transaction Type',
    type: 'select',
    validValues: ['Purchase', 'Refinance', 'HELOC'],
  },
  total_monthly_income: {
    displayName: 'Total Monthly Income',
    type: 'currency',
  },
  insurance_amount: {
    displayName: 'Monthly Insurance',
    type: 'currency',
  },
  piti_total: {
    displayName: 'Total Monthly Payment (PITI)',
    type: 'currency',
  },
  monthly_taxes: {
    displayName: 'Monthly Taxes',
    type: 'currency',
  },
  dti: {
    displayName: 'DTI Ratio',
    type: 'number',
  },
  cash_to_close: {
    displayName: 'Cash to Close',
    type: 'currency',
  },
};

// Status progression rules - a status cannot go backwards in its progression
const STATUS_PROGRESSIONS: Record<string, string[]> = {
  appraisal_status: ['Ordered', 'Scheduled', 'Inspected', 'Received'],
  package_status: ['Initial', 'Final'],
  title_status: ['Ordered', 'Received', 'Cleared'],
  cd_status: ['N/A', 'Requested', 'Sent', 'Signed'],
  hoi_status: ['Quoted', 'Ordered', 'Bound'],
  condo_status: ['Ordered', 'Received', 'Approved'],
  loan_status: ['New', 'RFP', 'SUB', 'AWC', 'CTC', 'CLOSED'],
};

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

3. **WIRE AMOUNTS**: Wire transfer amounts do NOT indicate loan_amount changes. Only suggest loan_amount changes if the email explicitly states "new loan amount", "loan amount changed", or similar phrasing that clearly indicates the loan amount itself is being modified.

4. **STATUS PROGRESSION - NEVER DOWNGRADE**: Never suggest a status that is EARLIER in the workflow than the current value. Status progressions are:
   - Appraisal: Ordered → Scheduled → Inspected → Received (if current is "Inspected", never suggest "Ordered" or "Scheduled")
   - Package: Initial → Final (if current is "Final", never suggest "Initial")
   - Title: Ordered → Received → Cleared
   - CD: N/A → Requested → Sent → Signed
   - Insurance (HOI): Quoted → Ordered → Bound
   - Condo: Ordered → Received → Approved

5. **PACKAGE STATUS MAPPING**: 
   - "in progress", "started", "beginning" → suggest "Initial"
   - "final", "complete", "finished", "closing package" → suggest "Final"
   - NEVER suggest "Completed" or "In Progress" as these are NOT valid values

6. **CD vs PACKAGE - CRITICAL DISTINCTION**:
   - **cd_status (Initial Closing Disclosure)**: The CD is sent when the file is ALMOST at the finish line but not quite. Look for: "CD sent", "Initial Closing Disclosure", "Closing Disclosure sent", "CD for review"
   - **package_status (Final Closing Package)**: The Package is the FINAL closing package that the title company works on with the broker's closing department. Look for: "Closing package sent", "Final package", "Documents sent to settlement agent", "Closing docs ready", "Package for signing"
   - These are DIFFERENT fields - do NOT confuse them!
   - If email mentions "closing package" or "documents to title/settlement" → package_status
   - If email mentions "CD" or "closing disclosure" specifically → cd_status

7. **CLOSING DATE CONFIRMATION**: Only suggest close_date if the email explicitly confirms a closing date (e.g., "closing on 12/12", "scheduled to close"). Do not change close_date based on estimated or tentative dates.

8. **TITLE CASE FOR STATUS VALUES**: All status field values should use Title Case (e.g., "Ordered", "Received", "Scheduled"), not UPPERCASE.

9. **RATE LOCK CONFIRMATION EMAILS**: These emails contain extremely valuable structured data. Look for:
   - Subject containing "Lock Confirmation" or "Rate Lock"
   - Tabular data with fields like: Interest Rate, Note Rate, Points, Program, Property Type, LTV, DSCR, FICO, Lock Expiration
   - Parse ALL available fields: interest_rate, discount_points, loan_program, property_type, ltv, dscr_ratio, fico_score, lock_expiration_date, loan_amount, term, prepayment_penalty, escrow, occupancy, total_monthly_income, insurance_amount, piti_total, monthly_taxes, dti, cash_to_close
   - For rate lock emails from automated lender systems, use confidence 1.0 (100%)
   - Match program names: "DSCR" → "DSCR", "Conv" or "Conventional" → "Conventional", "FHA" → "FHA"
   - Property types: "SFR" or "Single Family" → "Single Family", "Condo" or "Condominium" → "Condo", "Townhouse" → "Townhouse"

10. **CONFIDENCE SCORING**:
    - 1.0 (100%): Automated lender emails with clear structured data (rate locks, package confirmations from noreply@ addresses)
    - 0.9-0.95: Clear status updates with explicit keywords ("Clear to Close", "Appraisal Received")
    - 0.7-0.85: Implied updates requiring interpretation
    - Below 0.7: Uncertain or ambiguous

11. **OCCUPANCY MAPPING**:
    - "Primary", "Primary Residence", "Owner Occupied" → "Primary Home"
    - "Second Home", "Vacation Home" → "Second Home"
    - "Investment", "Non-Owner Occupied", "Rental" → "Investment"

12. **TRANSACTION TYPE MAPPING**:
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
      
      // Validate suggestions
      suggestions = suggestions.filter((s: any) => {
        return s.field_name && 
               s.suggested_value && 
               s.reason &&
               s.field_name in FIELD_DEFINITIONS;
      });

      // Add display names if missing
      suggestions = suggestions.map((s: any) => ({
        ...s,
        field_display_name: s.field_display_name || FIELD_DEFINITIONS[s.field_name as keyof typeof FIELD_DEFINITIONS]?.displayName || s.field_name,
        confidence: s.confidence || 0.8,
      }));

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