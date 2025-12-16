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
- lender_name: The name of the lender/company sending the email
- max_loan_amount: Maximum loan amount (format as "$X,XXX,XXX" or null)
- min_loan_amount: Minimum loan amount (format as "$XXX,XXX" or null)
- max_ltv: Maximum LTV percentage (format as "XX%" or null)
- min_fico: Minimum credit score (format as number like "620" or null)
- products: Array of loan products mentioned (e.g., ["DSCR", "Bank Statement", "P&L", "Non-QM", "Non-Warrantable Condo", "1099", "ITIN", "Asset Depletion", "Foreign National"])
- dscr_ltv: DSCR-specific max LTV (format as "XX%" or null)
- bank_statement_ltv: Bank statement program max LTV (format as "XX%" or null)
- non_qm_ltv: Non-QM program max LTV (format as "XX%" or null)
- interest_only: Whether interest-only is available (true/false/null)
- prepay_penalty: Prepayment penalty info (e.g., "3 year", "None", or null)
- special_features: Array of notable features (e.g., ["No MI", "24-hour turn times", "Investor cash-out allowed"])
- restrictions: Array of restrictions or limitations mentioned
- notes: Any other important details not captured above

IMPORTANT: Only extract data that is explicitly stated in the email. Do not infer or make up values.`
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
                  products: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'List of loan products mentioned'
                  },
                  dscr_ltv: { type: 'string', nullable: true },
                  bank_statement_ltv: { type: 'string', nullable: true },
                  non_qm_ltv: { type: 'string', nullable: true },
                  interest_only: { type: 'boolean', nullable: true },
                  prepay_penalty: { type: 'string', nullable: true },
                  special_features: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Notable features or benefits'
                  },
                  restrictions: { 
                    type: 'array', 
                    items: { type: 'string' },
                    description: 'Restrictions or limitations'
                  },
                  notes: { type: 'string', nullable: true },
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

    // If emailLogId provided, update the email_logs record
    if (emailLogId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    return new Response(JSON.stringify({
      success: true,
      data: extractedData,
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
