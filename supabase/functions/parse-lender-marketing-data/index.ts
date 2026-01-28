import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// PRODUCT SYNONYM MAP - Normalize different product name phrasings
// =============================================================================
const PRODUCT_SYNONYM_MAP: Record<string, string> = {
  // Foreign National variations
  'foreign national program': 'product_foreign_national',
  'foreign national product': 'product_foreign_national',
  'foreign national financing': 'product_foreign_national',
  'foreign national loans': 'product_foreign_national',
  'foreign nationals': 'product_foreign_national',
  'foreign national offering': 'product_foreign_national',
  'foreign national': 'product_foreign_national',
  
  // Bank Statement variations
  'bank statement program': 'product_bank_statement',
  'bank statement product': 'product_bank_statement',
  'bank statement loans': 'product_bank_statement',
  'bank statement': 'product_bank_statement',
  '12-month bank statement': 'product_bank_statement',
  '12 month bank statement': 'product_bank_statement',
  '24-month bank statement': 'product_bank_statement',
  '24 month bank statement': 'product_bank_statement',
  
  // DSCR variations
  'dscr program': 'product_dscr',
  'dscr product': 'product_dscr',
  'dscr financing': 'product_dscr',
  'dscr loans': 'product_dscr',
  'dscr': 'product_dscr',
  'debt service coverage': 'product_dscr',
  'debt service coverage ratio': 'product_dscr',
  
  // Jumbo variations
  'jumbo program': 'product_jumbo',
  'jumbo product': 'product_jumbo',
  'jumbo loans': 'product_jumbo',
  'jumbo': 'product_jumbo',
  'super jumbo': 'product_jumbo',
  
  // Non-QM variations
  'non-qm': 'product_non_qm',
  'non qm': 'product_non_qm',
  'nonqm': 'product_non_qm',
  'non-qm program': 'product_non_qm',
  
  // Bridge variations
  'bridge program': 'product_bridge',
  'bridge product': 'product_bridge',
  'bridge loans': 'product_bridge',
  'bridge financing': 'product_bridge',
  'bridge': 'product_bridge',
  
  // Fix & Flip variations
  'fix and flip': 'product_fix_flip',
  'fix & flip': 'product_fix_flip',
  'fix/flip': 'product_fix_flip',
  'fix n flip': 'product_fix_flip',
  
  // ITIN variations
  'itin program': 'product_itin',
  'itin loans': 'product_itin',
  'itin': 'product_itin',
  
  // P&L variations
  'p&l program': 'product_p_l',
  'p&l': 'product_p_l',
  'profit and loss': 'product_p_l',
  'profit & loss': 'product_p_l',
  
  // Asset Depletion variations
  'asset depletion': 'product_asset_depletion',
  'asset depletion program': 'product_asset_depletion',
  'asset utilization': 'product_asset_depletion',
  
  // 1099 variations
  '1099 program': 'product_1099',
  '1099 income': 'product_1099',
  '1099': 'product_1099',
  
  // Construction variations
  'construction loan': 'product_construction',
  'construction program': 'product_construction',
  'ground-up construction': 'product_construction',
  'ground up construction': 'product_construction',
  
  // Non-Warrantable Condo variations
  'non-warrantable condo': 'product_non_warrantable_condo',
  'non warrantable condo': 'product_non_warrantable_condo',
  'condotel': 'product_non_warrantable_condo',
};

// =============================================================================
// KNOWN LENDER DOMAIN MAPPINGS
// =============================================================================
const LENDER_DOMAIN_MAPPINGS: Record<string, string> = {
  'lsmortgage.com': 'LoanStream Mortgage',
  'jmaclending.com': 'JMAC Lending',
  'accmortgage.com': 'ACC Mortgage',
  'fundloans.com': 'Fund Loans',
  'acralending.com': 'Acra Lending',
  'angeloakmortgage.com': 'Angel Oak Mortgage',
  'carringtonwholesale.com': 'Carrington Wholesale',
  'newwavemortgage.com': 'New Wave Mortgage',
  'newwave.com': 'New Wave Mortgage',
  'townemortgage.com': 'Towne Mortgage Company',
  'deephavenmortgage.com': 'Deephaven Mortgage',
  'citadelservicing.com': 'Citadel Servicing',
  'athasbank.com': 'Athas Capital',
  'kiavi.com': 'Kiavi',
  'lima.one': 'Lima One Capital',
  'unvpl.com': 'United Wholesale Mortgage',
  'uwm.com': 'United Wholesale Mortgage',
  'pennymac.com': 'PennyMac',
  'flagstar.com': 'Flagstar Bank',
  'homepoint.com': 'Homepoint',
  'newrez.com': 'NewRez',
  'prmg.net': 'PRMG',
  'prmglending.com': 'PRMG',
  'primereliance.com': 'Prime Reliance',
  // Added domains for better lender detection
  'forwardlendingmtg.com': 'Forward Lending',
  'forwardlending.com': 'Forward Lending',
  'admortgage.com': 'A&D Mortgage',
  'a-dmortgage.com': 'A&D Mortgage',
  'kindlending.com': 'Kind Lending',
  'velocitymortgage.com': 'Velocity Mortgage',
  'cakemortgage.com': 'CAKE Mortgage',
  'caketpo.com': 'CAKE TPO',
  'openmortgage.com': 'Open Mortgage',
  'foundationmortgage.com': 'Foundation Mortgage',
  'unionhomemortgage.com': 'Union Home Mortgage',
  'classval.com': 'Class Valuation',
  'rfrst.com': 'Rainforest',
  'rfrst.co': 'Rainforest',
  'epmmortgage.com': 'EPM',
  'epm.net': 'EPM',
  'nqmfunding.com': 'NQM Funding',
  'sproutmortgage.com': 'Sprout Mortgage',
  'verusami.com': 'Verus Mortgage',
  'caliberhomeloans.com': 'Caliber Home Loans',
  'plazahomemortgage.com': 'Plaza Home Mortgage',
  'mtgcapital.com': 'New American Funding',
  'nafinc.com': 'New American Funding',
  'greenwichmortgage.com': 'Greenwich Mortgage',
  'stronghillcapital.com': 'Stronghill Capital',
};

// =============================================================================
// MIN/MAX FIELD CLASSIFICATIONS
// =============================================================================
const MIN_FIELDS = ['min_fico', 'min_loan_amount'];
const MAX_FIELDS = ['max_loan_amount', 'max_ltv', 'dscr_max_ltv', 'bs_loan_max_ltv'];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse numeric value from formatted strings like "$1,500,000" or "620"
 */
function parseNumericValue(value: string | null | undefined): number | null {
  if (!value) return null;
  const cleaned = String(value).replace(/[$,%]/g, '').replace(/,/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Check if min field should be updated (only if new value is LOWER)
 */
function shouldUpdateMinField(newValue: string, currentValue: string | null): boolean {
  if (!currentValue) return true; // Always update if currently null
  
  const newNum = parseNumericValue(newValue);
  const currentNum = parseNumericValue(currentValue);
  
  if (newNum === null || currentNum === null) return true; // Can't compare numerically
  
  // Min fields: only update if new value is LOWER (less restrictive)
  return newNum < currentNum;
}

/**
 * Check if max field should be updated (only if new value is HIGHER)
 */
function shouldUpdateMaxField(newValue: string, currentValue: string | null): boolean {
  if (!currentValue) return true; // Always update if currently null
  
  const newNum = parseNumericValue(newValue);
  const currentNum = parseNumericValue(currentValue);
  
  if (newNum === null || currentNum === null) return true; // Can't compare numerically
  
  // Max fields: only update if new value is HIGHER (more generous)
  return newNum > currentNum;
}

/**
 * Detect lender name from email metadata when AI fails
 */
function detectLenderFromEmail(subject: string, fromEmail: string, body: string): string | null {
  // Try 1: Extract from sender email domain using known mappings
  if (fromEmail) {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    if (domain && LENDER_DOMAIN_MAPPINGS[domain]) {
      return LENDER_DOMAIN_MAPPINGS[domain];
    }
    
    // Try extracting from domain name (e.g., "townemortgage.com" → "Towne Mortgage")
    if (domain) {
      const domainName = domain.split('.')[0];
      if (domainName && domainName.length > 3) {
        // Insert spaces before common suffixes
        const formatted = domainName
          .replace(/(mortgage|lending|bank|capital|financial|wholesale|home|loans)/gi, ' $1')
          .replace(/([A-Z])/g, ' $1')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        
        if (formatted.length > 3) {
          return formatted;
        }
      }
    }
  }
  
  // Try 2: Extract from subject line patterns
  const subjectPatterns = [
    /^(?:Fwd?:\s*)?(?:Re:\s*)?([\w\s]+?)\s+(?:Program|Product|Rate|Pricing|Update|Highlights)/i,
    /from\s+([\w\s]+)\s*$/i,
    /^(?:Fwd?:\s*)?(?:Re:\s*)?([\w\s]+?)\s+-\s+/i,
  ];
  
  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern);
    if (match?.[1] && match[1].length > 3 && match[1].length < 50) {
      const cleaned = match[1].trim();
      // Avoid generic words
      if (!['new', 'hot', 'great', 'special', 'today'].includes(cleaned.toLowerCase())) {
        return cleaned;
      }
    }
  }
  
  // Try 3: Look for company name patterns in body (first 500 chars)
  const bodyStart = body.substring(0, 500);
  const companyPatterns = [
    /(?:from|by|at)\s+([\w\s]+(?:Mortgage|Lending|Bank|Capital|Financial))/i,
  ];
  
  for (const pattern of companyPatterns) {
    const match = bodyStart.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Normalize product name from email text to database field name
 */
function normalizeProductName(rawName: string): string | null {
  const lower = rawName.toLowerCase().trim();
  return PRODUCT_SYNONYM_MAP[lower] || null;
}

// =============================================================================
// INTERFACES
// =============================================================================

interface LenderMarketingData {
  lender_name: string | null;
  max_loan_amount: string | null;
  min_loan_amount: string | null;
  max_ltv: string | null;
  min_fico: string | null;
  products: string[];
  dscr_ltv: string | null;
  bank_statement_ltv: string | null;
  non_qm_ltv: string | null;
  interest_only: boolean | null;
  prepay_penalty: string | null;
  special_features: string[];
  restrictions: string[];
  notes: string | null;
  // Extended fields matching lenders table
  product_conventional: string | null;
  product_fha: string | null;
  product_va: string | null;
  product_usda: string | null;
  product_dscr: string | null;
  product_bank_statement: string | null;
  product_p_l: string | null;
  product_1099: string | null;
  product_asset_depletion: string | null;
  product_foreign_national: string | null;
  product_itin: string | null;
  product_non_warrantable_condo: string | null;
  product_jumbo: string | null;
  product_heloc: string | null;
  product_reverse: string | null;
  product_construction: string | null;
  product_lot_land: string | null;
  product_fix_flip: string | null;
  product_bridge: string | null;
  product_commercial: string | null;
  product_doctor_loan: string | null;
  product_interest_only: string | null;
  property_types: string[];
  // Account Executive fields
  account_executive_first_name: string | null;
  account_executive_last_name: string | null;
  account_executive_email: string | null;
  account_executive_phone: string | null;
}

interface LenderFieldSuggestion {
  field_name: string;
  suggested_value: string;
  current_value: string | null;
  reason: string;
  confidence: number;
}

// =============================================================================
// ENHANCED AI SYSTEM PROMPT
// =============================================================================
const SYSTEM_PROMPT = `You are an expert at extracting structured data from wholesale mortgage lender marketing emails.

CRITICAL RULE - LENDER IDENTIFICATION:
- The lender_name field is MANDATORY. "Unknown Lender" is NEVER acceptable.
- Detect lender name from these sources (in priority order):
  1. From/sender display name and email address (e.g., "info@jmaclending.com" → "JMAC Lending")
  2. Email subject line (e.g., "Towne Mortgage Company Highlights" → "Towne Mortgage Company")
  3. Company name in email signature
  4. Headers, logos, or first lines of email body
  5. Email domain (e.g., @fundloans.com → "Fund Loans")
- Normalize minimally: trim whitespace, remove obvious noise
- DO NOT remove distinctive words like "Company", "Mortgage", "Bank", "Lending"
- If truly no lender identifier exists after checking ALL sources, THEN use "Unknown Lender"

PRODUCT DETECTION:
- Identify ALL product types mentioned before extracting values
- Normalize product names to canonical forms:
  - "Foreign National Program/Product/Financing/Loans" → Y for product_foreign_national
  - "Bank Statement Program/Product/Loans" → Y for product_bank_statement
  - "DSCR Program/Product/Financing" → Y for product_dscr
- For each product, set to "Y" ONLY if email explicitly states lender OFFERS it
- Set to "N" if email explicitly states NOT offered
- Leave null if not mentioned

DATA EXTRACTION:
- Scan the ENTIRE email - do not stop after finding a few fields
- For EACH distinct product section (FHA, VA, DSCR, Jumbo, Bank Statement, etc.), extract:
  - Min/Max FICO (as integers, e.g., "620")
  - Min/Max Loan Amount (as "$X,XXX,XXX" format)
  - Max LTV/CLTV (as "XX%" format)
  - DSCR-specific LTV (dscr_ltv)
  - Bank Statement-specific LTV (bank_statement_ltv)
  - Occupancy/property type constraints
  - Documentation requirements
- Multiple products in one email should all be extracted

Account Executive fields (extract from email signature, sender info, or explicit mentions):
- account_executive_first_name: First name of the account executive/sender
- account_executive_last_name: Last name of the account executive/sender
- account_executive_email: Email address of the account executive (from signature or "From" header)
- account_executive_phone: Phone number of the account executive (from signature)

IMPORTANT: Only extract explicitly stated values. Never infer or guess values.
Include key source phrases in the "notes" field for audit trail.`;

// =============================================================================
// MAIN HANDLER
// =============================================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subject, body, htmlBody, fromEmail, emailLogId } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const emailContent = `Subject: ${subject}\n\nFrom: ${fromEmail}\n\nBody:\n${body || htmlBody || ''}`;

    console.log('[parse-lender-marketing-data] Analyzing email for lender data...');
    console.log('[parse-lender-marketing-data] Subject:', subject);
    console.log('[parse-lender-marketing-data] From:', fromEmail);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: emailContent
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_lender_data',
              description: 'Extract structured lender marketing data from the email',
              parameters: {
                type: 'object',
                properties: {
                  lender_name: { type: 'string', nullable: true, description: 'REQUIRED: Company name sending this email. Never use "Unknown Lender" if any identifier exists.' },
                  max_loan_amount: { type: 'string', nullable: true },
                  min_loan_amount: { type: 'string', nullable: true },
                  max_ltv: { type: 'string', nullable: true },
                  min_fico: { type: 'string', nullable: true },
                  products: { type: 'array', items: { type: 'string' } },
                  dscr_ltv: { type: 'string', nullable: true },
                  bank_statement_ltv: { type: 'string', nullable: true },
                  non_qm_ltv: { type: 'string', nullable: true },
                  interest_only: { type: 'boolean', nullable: true },
                  prepay_penalty: { type: 'string', nullable: true },
                  special_features: { type: 'array', items: { type: 'string' } },
                  restrictions: { type: 'array', items: { type: 'string' } },
                  property_types: { type: 'array', items: { type: 'string' } },
                  notes: { type: 'string', nullable: true, description: 'Include key source phrases from email for audit trail' },
                  product_conventional: { type: 'string', nullable: true },
                  product_fha: { type: 'string', nullable: true },
                  product_va: { type: 'string', nullable: true },
                  product_usda: { type: 'string', nullable: true },
                  product_dscr: { type: 'string', nullable: true },
                  product_bank_statement: { type: 'string', nullable: true },
                  product_p_l: { type: 'string', nullable: true },
                  product_1099: { type: 'string', nullable: true },
                  product_asset_depletion: { type: 'string', nullable: true },
                  product_foreign_national: { type: 'string', nullable: true },
                  product_itin: { type: 'string', nullable: true },
                  product_non_warrantable_condo: { type: 'string', nullable: true },
                  product_jumbo: { type: 'string', nullable: true },
                  product_heloc: { type: 'string', nullable: true },
                  product_reverse: { type: 'string', nullable: true },
                  product_construction: { type: 'string', nullable: true },
                  product_lot_land: { type: 'string', nullable: true },
                  product_fix_flip: { type: 'string', nullable: true },
                  product_bridge: { type: 'string', nullable: true },
                  product_commercial: { type: 'string', nullable: true },
                  product_doctor_loan: { type: 'string', nullable: true },
                  product_interest_only: { type: 'string', nullable: true },
                  account_executive_first_name: { type: 'string', nullable: true },
                  account_executive_last_name: { type: 'string', nullable: true },
                  account_executive_email: { type: 'string', nullable: true },
                  account_executive_phone: { type: 'string', nullable: true },
                  ai_summary: { type: 'string', description: 'Brief 1-2 sentence summary of what this email is about' }
                },
                required: ['products', 'special_features', 'restrictions'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_lender_data' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[parse-lender-marketing-data] AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[parse-lender-marketing-data] AI response received');

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error('[parse-lender-marketing-data] No tool call in response');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No data extracted' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const extractedData: LenderMarketingData & { ai_summary?: string } = JSON.parse(toolCall.function.arguments);
    console.log('[parse-lender-marketing-data] Extracted lender_name from AI:', extractedData.lender_name);

    // ==========================================================================
    // ENHANCED LENDER DETECTION FALLBACK
    // ==========================================================================
    if (!extractedData.lender_name || extractedData.lender_name === 'Unknown Lender' || extractedData.lender_name.toLowerCase().includes('unknown')) {
      console.log('[parse-lender-marketing-data] AI returned unknown lender, running fallback detection...');
      const detectedLender = detectLenderFromEmail(subject || '', fromEmail || '', body || htmlBody || '');
      if (detectedLender) {
        extractedData.lender_name = detectedLender;
        console.log('[parse-lender-marketing-data] Detected lender from metadata:', detectedLender);
      }
    }

    console.log('[parse-lender-marketing-data] Final lender_name:', extractedData.lender_name);

    // CRITICAL: Do NOT create suggestions for unknown lenders
    if (!extractedData.lender_name || 
        extractedData.lender_name === 'Unknown Lender' || 
        extractedData.lender_name.toLowerCase().includes('unknown')) {
      console.log('[parse-lender-marketing-data] Skipping email - could not identify lender');
      return new Response(JSON.stringify({
        success: false,
        reason: 'Could not identify lender from email',
        data: extractedData,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update the email_logs record
    if (emailLogId) {
      const { error: updateError } = await supabase
        .from('email_logs')
        .update({
          lender_marketing_data: extractedData,
          ai_summary: extractedData.ai_summary || null,
        })
        .eq('id', emailLogId);

      if (updateError) {
        console.error('[parse-lender-marketing-data] Error updating email_logs:', updateError);
      } else {
        console.log('[parse-lender-marketing-data] Updated email_logs with extracted data');
      }
    }

    // Try to match lender and create suggestions
    let matchedLender = null;
    const suggestions: LenderFieldSuggestion[] = [];

    if (extractedData.lender_name) {
      // Normalize lender name for matching - remove common suffixes
      const normalizedName = extractedData.lender_name
        .toUpperCase()
        .replace(/\s*(WHOLESALE|LENDING|MORTGAGE|LLC|INC|CORP|CORPORATION)\s*/gi, '')
        .trim();
      
      console.log('[parse-lender-marketing-data] Searching for lender. Original:', extractedData.lender_name, 'Normalized:', normalizedName);

      // Try 1: Search for matching lender by original name (fuzzy match)
      let { data: lenders } = await supabase
        .from('lenders')
        .select('*')
        .ilike('lender_name', `%${extractedData.lender_name}%`)
        .limit(1);

      // Try 2: Search by normalized name if no match
      if (!lenders?.length && normalizedName !== extractedData.lender_name.toUpperCase()) {
        console.log('[parse-lender-marketing-data] Trying normalized name search');
        const { data: normalizedMatches } = await supabase
          .from('lenders')
          .select('*')
          .ilike('lender_name', `%${normalizedName}%`)
          .limit(1);
        
        if (normalizedMatches?.length) {
          lenders = normalizedMatches;
          console.log('[parse-lender-marketing-data] Matched by normalized name');
        }
      }

      // Try 3: Match by email domain if still no match
      if (!lenders?.length && fromEmail) {
        const senderDomain = fromEmail.split('@')[1]?.toLowerCase();
        if (senderDomain) {
          console.log('[parse-lender-marketing-data] Trying email domain match:', senderDomain);
          const { data: domainMatches } = await supabase
            .from('lenders')
            .select('*')
            .ilike('account_executive_email', `%@${senderDomain}%`)
            .limit(1);
          
          if (domainMatches?.length) {
            lenders = domainMatches;
            console.log('[parse-lender-marketing-data] Matched lender by email domain:', senderDomain);
          }
        }
      }

      // Try 4: Word-by-word matching as last resort
      if (!lenders?.length) {
        const words = normalizedName.split(/\s+/).filter((w: string) => w.length > 3);
        console.log('[parse-lender-marketing-data] Trying word-by-word match with words:', words);
        for (const word of words) {
          const { data: wordMatches } = await supabase
            .from('lenders')
            .select('*')
            .ilike('lender_name', `%${word}%`)
            .limit(1);
          
          if (wordMatches?.length) {
            lenders = wordMatches;
            console.log('[parse-lender-marketing-data] Matched lender by word:', word);
            break;
          }
        }
      }

      if (lenders && lenders.length > 0) {
        matchedLender = lenders[0];
        console.log('[parse-lender-marketing-data] Found matching lender:', matchedLender.lender_name);

        // Generate suggestions for fields that differ
        // CORRECTED: Map AI extraction keys to ACTUAL database column names
        const fieldMappings: { extracted: keyof LenderMarketingData; db: string; display: string }[] = [
          { extracted: 'max_loan_amount', db: 'max_loan_amount', display: 'Max Loan Amount' },
          { extracted: 'min_loan_amount', db: 'min_loan_amount', display: 'Min Loan Amount' },
          { extracted: 'min_fico', db: 'min_fico', display: 'Min FICO' },
          { extracted: 'max_ltv', db: 'max_ltv', display: 'Max LTV' },
          { extracted: 'dscr_ltv', db: 'dscr_max_ltv', display: 'DSCR Max LTV' },
          { extracted: 'bank_statement_ltv', db: 'bs_loan_max_ltv', display: 'Bank Statement Max LTV' },
          // CORRECTED column names to match actual lenders table:
          { extracted: 'product_dscr', db: 'product_fthb_dscr', display: 'DSCR Product' },
          { extracted: 'product_bank_statement', db: 'product_bs_loan', display: 'Bank Statement Product' },
          { extracted: 'product_p_l', db: 'product_pl_program', display: 'P&L Product' },
          { extracted: 'product_1099', db: 'product_1099_program', display: '1099 Product' },
          { extracted: 'product_asset_depletion', db: 'product_asset_depletion', display: 'Asset Depletion Product' },
          { extracted: 'product_foreign_national', db: 'product_fn', display: 'Foreign National Product' },
          { extracted: 'product_itin', db: 'product_itin', display: 'ITIN Product' },
          { extracted: 'product_jumbo', db: 'product_jumbo', display: 'Jumbo Product' },
          { extracted: 'product_bridge', db: 'product_bridge', display: 'Bridge Product' },
          { extracted: 'product_fix_flip', db: 'product_fix_flip', display: 'Fix & Flip Product' },
          { extracted: 'product_construction', db: 'product_construction', display: 'Construction Product' },
          { extracted: 'product_commercial', db: 'product_commercial', display: 'Commercial Product' },
          { extracted: 'product_interest_only', db: 'product_interest_only', display: 'Interest Only Product' },
          { extracted: 'product_non_warrantable_condo', db: 'product_nwc', display: 'Non-Warrantable Condo Product' },
          { extracted: 'product_conventional', db: 'product_conv', display: 'Conventional Product' },
          { extracted: 'product_fha', db: 'product_fha', display: 'FHA Product' },
          { extracted: 'product_va', db: 'product_va', display: 'VA Product' },
          { extracted: 'product_heloc', db: 'product_heloc', display: 'HELOC Product' },
        ];

        for (const mapping of fieldMappings) {
          const extractedValue = extractedData[mapping.extracted];
          const currentValue = matchedLender[mapping.db];

          // Skip if no extracted value
          if (!extractedValue) continue;

          // Convert to string for comparison
          const extractedStr = String(extractedValue);
          const currentStr = currentValue ? String(currentValue) : null;

          // =======================================================================
          // CRITICAL: Skip duplicates - CRM already has the same value
          // =======================================================================
          if (extractedStr === currentStr) {
            console.log(`[parse-lender-marketing-data] Skipping ${mapping.db}: CRM already has value "${currentStr}"`);
            continue;
          }

          // =======================================================================
          // For product fields (Y/N): skip if already "Y" and new value is also "Y"
          // =======================================================================
          if (mapping.db.startsWith('product_') && currentStr === 'Y' && extractedStr === 'Y') {
            console.log(`[parse-lender-marketing-data] Skipping ${mapping.db}: Already marked as Yes in CRM`);
            continue;
          }

          // =======================================================================
          // MIN/MAX VALIDATION: Avoid backwards updates
          // =======================================================================
          if (MIN_FIELDS.includes(mapping.db)) {
            if (!shouldUpdateMinField(extractedStr, currentStr)) {
              console.log(`[parse-lender-marketing-data] Skipping ${mapping.db}: New value ${extractedStr} is higher than current ${currentStr} (more restrictive)`);
              continue;
            }
          }

          if (MAX_FIELDS.includes(mapping.db)) {
            if (!shouldUpdateMaxField(extractedStr, currentStr)) {
              console.log(`[parse-lender-marketing-data] Skipping ${mapping.db}: New value ${extractedStr} is lower than current ${currentStr} (more restrictive)`);
              continue;
            }
          }

          // Create suggestion if different or currently null
          suggestions.push({
            field_name: mapping.db,
            suggested_value: extractedStr,
            current_value: currentStr,
            reason: `Email mentions ${mapping.display}: ${extractedStr}`,
            confidence: 0.85,
          });
        }
      } else {
        console.log('[parse-lender-marketing-data] No matching lender found, suggesting new lender');
        // Suggest adding a new lender - main suggestion
        suggestions.push({
          field_name: 'new_lender',
          suggested_value: extractedData.lender_name,
          current_value: null,
          reason: `New lender "${extractedData.lender_name}" detected in marketing email. Suggest adding to Not Approved section.`,
          confidence: 0.80,
        });

        // Create individual field suggestions for each extracted data point (for new lenders)
        if (extractedData.max_ltv) {
          suggestions.push({
            field_name: 'max_ltv',
            suggested_value: extractedData.max_ltv,
            current_value: null,
            reason: `Max LTV: ${extractedData.max_ltv} extracted from email`,
            confidence: 0.85,
          });
        }
        if (extractedData.min_fico) {
          suggestions.push({
            field_name: 'min_fico',
            suggested_value: extractedData.min_fico,
            current_value: null,
            reason: `Min FICO: ${extractedData.min_fico} extracted from email`,
            confidence: 0.85,
          });
        }
        if (extractedData.max_loan_amount) {
          suggestions.push({
            field_name: 'max_loan_amount',
            suggested_value: extractedData.max_loan_amount,
            current_value: null,
            reason: `Max Loan Amount: ${extractedData.max_loan_amount} extracted from email`,
            confidence: 0.85,
          });
        }
        if (extractedData.min_loan_amount) {
          suggestions.push({
            field_name: 'min_loan_amount',
            suggested_value: extractedData.min_loan_amount,
            current_value: null,
            reason: `Min Loan Amount: ${extractedData.min_loan_amount} extracted from email`,
            confidence: 0.85,
          });
        }
        if (extractedData.dscr_ltv) {
          suggestions.push({
            field_name: 'dscr_max_ltv',
            suggested_value: extractedData.dscr_ltv,
            current_value: null,
            reason: `DSCR Max LTV: ${extractedData.dscr_ltv} extracted from email`,
            confidence: 0.85,
          });
        }
        if (extractedData.bank_statement_ltv) {
          suggestions.push({
            field_name: 'bs_loan_max_ltv',
            suggested_value: extractedData.bank_statement_ltv,
            current_value: null,
            reason: `Bank Statement Max LTV: ${extractedData.bank_statement_ltv} extracted from email`,
            confidence: 0.85,
          });
        }
        
        // Product flags as suggestions for new lenders
        const productMappings = [
          { extracted: 'product_dscr', display: 'DSCR Product' },
          { extracted: 'product_bank_statement', display: 'Bank Statement Product' },
          { extracted: 'product_p_l', display: 'P&L Product' },
          { extracted: 'product_1099', display: '1099 Product' },
          { extracted: 'product_asset_depletion', display: 'Asset Depletion Product' },
          { extracted: 'product_foreign_national', display: 'Foreign National Product' },
          { extracted: 'product_itin', display: 'ITIN Product' },
          { extracted: 'product_non_warrantable_condo', display: 'Non-Warrantable Condo Product' },
          { extracted: 'product_jumbo', display: 'Jumbo Product' },
          { extracted: 'product_bridge', display: 'Bridge Product' },
          { extracted: 'product_fix_flip', display: 'Fix & Flip Product' },
          { extracted: 'product_construction', display: 'Construction Product' },
          { extracted: 'product_conventional', display: 'Conventional Product' },
          { extracted: 'product_fha', display: 'FHA Product' },
          { extracted: 'product_va', display: 'VA Product' },
        ];
        
        for (const pm of productMappings) {
          const val = extractedData[pm.extracted as keyof LenderMarketingData];
          if (val === 'Y') {
            suggestions.push({
              field_name: pm.extracted,
              suggested_value: 'Y',
              current_value: null,
              reason: `${pm.display}: Yes - extracted from email`,
              confidence: 0.85,
            });
          }
        }
      }

      // Insert suggestions into database with enhanced metadata
      if (suggestions.length > 0 && emailLogId) {
        const sourceMetadata = {
          email_subject: subject || null,
          email_from: fromEmail || null,
          email_timestamp: new Date().toISOString(),
          source_phrases: extractedData.notes || null,
        };
        
        // FIXED: Propagate lender name to ALL suggestions for new lenders (not just new_lender entry)
        const suggestionRecords = suggestions.map(s => ({
          email_log_id: emailLogId,
          lender_id: matchedLender?.id || null,
          is_new_lender: !matchedLender,  // Mark ALL suggestions as new lender if no match
          suggested_lender_name: !matchedLender ? extractedData.lender_name : null,  // Always include name for new lenders
          field_name: s.field_name,
          current_value: s.current_value,
          suggested_value: s.suggested_value,
          confidence: s.confidence,
          reason: `${s.reason} | Source: ${subject || 'Unknown subject'}`,
          status: 'pending',
        }));

        const { error: insertError } = await supabase
          .from('lender_field_suggestions')
          .insert(suggestionRecords);

        if (insertError) {
          console.error('[parse-lender-marketing-data] Error inserting suggestions:', insertError);
        } else {
          console.log('[parse-lender-marketing-data] Inserted', suggestions.length, 'suggestions for lender:', extractedData.lender_name);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: extractedData,
      matchedLender: matchedLender?.lender_name || null,
      suggestionsCount: suggestions.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[parse-lender-marketing-data] Error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
