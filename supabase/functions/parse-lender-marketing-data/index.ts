import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
            content: `You are an expert at extracting structured data from wholesale mortgage lender marketing emails.

Your task is to extract specific lender information from the email content. Extract ALL data points you can find.

Data points to extract:
- lender_name: The name of the lender/company sending the email (e.g., "JMac Lending", "ACC Mortgage", "Carrington")
- max_loan_amount: Maximum loan amount (format as "$X,XXX,XXX" or null)
- min_loan_amount: Minimum loan amount (format as "$XXX,XXX" or null)
- max_ltv: Maximum LTV percentage (format as "XX%" or null)
- min_fico: Minimum credit score (format as number like "620" or null)
- products: Array of loan products mentioned (e.g., ["DSCR", "Bank Statement", "P&L", "Non-QM", "Non-Warrantable Condo", "1099", "ITIN", "Asset Depletion", "Foreign National", "Full Doc", "Asset Utilization", "Jumbo", "Bridge", "Fix & Flip"])
- dscr_ltv: DSCR-specific max LTV (format as "XX%" or null)
- bank_statement_ltv: Bank statement program max LTV (format as "XX%" or null)
- non_qm_ltv: Non-QM program max LTV (format as "XX%" or null)
- interest_only: Whether interest-only is available (true/false/null)
- prepay_penalty: Prepayment penalty info (e.g., "3 year", "None", or null)
- special_features: Array of notable features (e.g., ["No MI", "24-hour turn times", "Investor cash-out allowed"])
- restrictions: Array of restrictions or limitations mentioned
- property_types: Array of property types allowed (e.g., ["Warehouse", "Office Space", "Retail", "Mixed Use", "Industrial"])
- notes: Any other important details not captured above

Account Executive fields (extract from email signature, sender info, or explicit mentions):
- account_executive_first_name: First name of the account executive/sender
- account_executive_last_name: Last name of the account executive/sender
- account_executive_email: Email address of the account executive (from signature or "From" header)
- account_executive_phone: Phone number of the account executive (from signature)

Product fields (Y for Yes, N for No, TBD if unclear, null if not mentioned):
- product_conventional, product_fha, product_va, product_usda, product_dscr, product_bank_statement
- product_p_l, product_1099, product_asset_depletion, product_foreign_national, product_itin
- product_non_warrantable_condo, product_jumbo, product_heloc, product_reverse, product_construction
- product_lot_land, product_fix_flip, product_bridge, product_commercial, product_doctor_loan
- product_interest_only

IMPORTANT: 
- Only extract data that is explicitly stated in the email. Do not infer or make up values.
- The lender_name should be the company sending the email, not a generic description.
- For product fields, set to "Y" if the email explicitly mentions offering that product.
- Look for account executive info in email signatures, sender name, "From:" headers, and explicit "Account Executive:" lines.`
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
                  lender_name: { type: 'string', nullable: true },
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
                  notes: { type: 'string', nullable: true },
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
                  account_executive_first_name: { type: 'string', nullable: true, description: 'First name of account executive from signature/sender' },
                  account_executive_last_name: { type: 'string', nullable: true, description: 'Last name of account executive from signature/sender' },
                  account_executive_email: { type: 'string', nullable: true, description: 'Email of account executive from signature' },
                  account_executive_phone: { type: 'string', nullable: true, description: 'Phone of account executive from signature' },
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
    console.log('[parse-lender-marketing-data] Extracted data:', extractedData);

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
      // Search for matching lender by name (fuzzy match)
      const { data: lenders } = await supabase
        .from('lenders')
        .select('*')
        .ilike('lender_name', `%${extractedData.lender_name}%`)
        .limit(1);

      if (lenders && lenders.length > 0) {
        matchedLender = lenders[0];
        console.log('[parse-lender-marketing-data] Found matching lender:', matchedLender.lender_name);

        // Generate suggestions for fields that differ
        const fieldMappings: { extracted: keyof LenderMarketingData; db: string; display: string }[] = [
          { extracted: 'max_loan_amount', db: 'max_loan_amount', display: 'Max Loan Amount' },
          { extracted: 'min_loan_amount', db: 'min_loan_amount', display: 'Min Loan Amount' },
          { extracted: 'min_fico', db: 'min_fico', display: 'Min FICO' },
          { extracted: 'product_dscr', db: 'product_dscr', display: 'DSCR Product' },
          { extracted: 'product_bank_statement', db: 'product_bank_statement', display: 'Bank Statement Product' },
          { extracted: 'product_p_l', db: 'product_p_l', display: 'P&L Product' },
          { extracted: 'product_1099', db: 'product_1099', display: '1099 Product' },
          { extracted: 'product_asset_depletion', db: 'product_asset_depletion', display: 'Asset Depletion Product' },
          { extracted: 'product_foreign_national', db: 'product_foreign_national', display: 'Foreign National Product' },
          { extracted: 'product_itin', db: 'product_itin', display: 'ITIN Product' },
          { extracted: 'product_jumbo', db: 'product_jumbo', display: 'Jumbo Product' },
          { extracted: 'product_bridge', db: 'product_bridge', display: 'Bridge Product' },
          { extracted: 'product_fix_flip', db: 'product_fix_flip', display: 'Fix & Flip Product' },
          { extracted: 'product_construction', db: 'product_construction', display: 'Construction Product' },
          { extracted: 'product_commercial', db: 'product_commercial', display: 'Commercial Product' },
          { extracted: 'product_interest_only', db: 'product_interest_only', display: 'Interest Only Product' },
          { extracted: 'product_non_warrantable_condo', db: 'product_non_warrantable_condo', display: 'Non-Warrantable Condo Product' },
        ];

        for (const mapping of fieldMappings) {
          const extractedValue = extractedData[mapping.extracted];
          const currentValue = matchedLender[mapping.db];

          // Skip if no extracted value
          if (!extractedValue) continue;

          // Convert to string for comparison
          const extractedStr = String(extractedValue);
          const currentStr = currentValue ? String(currentValue) : null;

          // Create suggestion if different or currently null
          if (extractedStr !== currentStr) {
            suggestions.push({
              field_name: mapping.db,
              suggested_value: extractedStr,
              current_value: currentStr,
              reason: `Email mentions ${mapping.display}: ${extractedStr}`,
              confidence: 0.85,
            });
          }
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
        // These will be auto-populated when user approves the "new_lender" suggestion
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
        // Product flags as suggestions
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

      // Insert suggestions into database
      if (suggestions.length > 0 && emailLogId) {
        const suggestionRecords = suggestions.map(s => ({
          email_log_id: emailLogId,
          lender_id: matchedLender?.id || null,
          is_new_lender: s.field_name === 'new_lender',
          suggested_lender_name: s.field_name === 'new_lender' ? extractedData.lender_name : null,
          field_name: s.field_name,
          current_value: s.current_value,
          suggested_value: s.suggested_value,
          confidence: s.confidence,
          reason: s.reason,
          status: 'pending',
        }));

        const { error: insertError } = await supabase
          .from('lender_field_suggestions')
          .insert(suggestionRecords);

        if (insertError) {
          console.error('[parse-lender-marketing-data] Error inserting suggestions:', insertError);
        } else {
          console.log('[parse-lender-marketing-data] Inserted', suggestions.length, 'suggestions');
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
