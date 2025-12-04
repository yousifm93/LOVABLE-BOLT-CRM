import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url, lead_id } = await req.json();
    
    console.log('[parse-rate-lock] Starting to parse rate lock confirmation');
    
    // Download file from signed URL
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('[parse-rate-lock] File downloaded, size:', blob.size, 'type:', blob.type);
    
    // Convert to base64 without using apply (which has argument limits)
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    
    // Build binary string character by character to avoid stack overflow
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    const base64 = btoa(binary);
    console.log('[parse-rate-lock] Converted to base64, length:', base64.length);
    
    // Use Lovable AI Gateway with Gemini Vision
    console.log('[parse-rate-lock] Calling AI Gateway...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: `Extract the following information from this rate lock confirmation document. Return ONLY a valid JSON object with these fields:

{
  "note_rate": NUMBER (the interest rate as a decimal, e.g. 6.99 not 6.99%),
  "lock_expiration": "YYYY-MM-DD format (from Expires field)",
  "term": NUMBER (amortization term in months, e.g. 360 for 30 years),
  "prepayment_penalty": "0" | "1" | "2" | "3" | "4" | "5" (years, extract from PPP field like "PPP 5 YR" = "5"),
  "dscr_ratio": NUMBER or null (DSCR ratio if present),
  "escrow_waiver": "Waived" | "Escrowed" (based on Escrow Waiver field)
}

Important:
- Look for "Note Rate" or "Rate" for the interest rate
- Look for "Expires" for the lock expiration date
- Look for "Amortization Term" or infer from program name (30YF = 360 months)
- Look for "Prepayment Penalty" or "PPP" - extract just the number of years (e.g., "PPP 5 YR" = "5", "None" = "0")
- Look for "DSCR Ratio" if this is a DSCR loan
- Look for "Escrow Waiver" field - if it says "Waived" return "Waived", otherwise "Escrowed"
- Return ONLY the JSON object, no additional text`
          }, {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${base64}`
            }
          }]
        }]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[parse-rate-lock] AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;
    
    console.log('[parse-rate-lock] AI response:', content);
    
    // Parse the extracted value
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract rate lock data from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[parse-rate-lock] Successfully extracted data:', parsed);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update the lead with extracted data
    const leadUpdate: Record<string, any> = {};
    
    if (parsed.note_rate) leadUpdate.interest_rate = parsed.note_rate;
    if (parsed.lock_expiration) leadUpdate.lock_expiration_date = parsed.lock_expiration;
    if (parsed.term) leadUpdate.term = parsed.term;
    if (parsed.prepayment_penalty !== undefined && parsed.prepayment_penalty !== null) {
      leadUpdate.prepayment_penalty = String(parsed.prepayment_penalty);
    }
    if (parsed.dscr_ratio) leadUpdate.dscr_ratio = parsed.dscr_ratio;
    if (parsed.escrow_waiver) leadUpdate.escrows = parsed.escrow_waiver;

    console.log('[parse-rate-lock] Updating lead with:', JSON.stringify(leadUpdate));

    if (Object.keys(leadUpdate).length > 0 && lead_id) {
      const { error: updateError } = await supabase
        .from('leads')
        .update(leadUpdate)
        .eq('id', lead_id);

      if (updateError) {
        console.error('[parse-rate-lock] Failed to update lead:', updateError);
        throw updateError;
      } else {
        console.log('[parse-rate-lock] Lead updated successfully');
      }
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      extracted_data: parsed,
      fields_updated: Object.keys(leadUpdate)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[parse-rate-lock] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
