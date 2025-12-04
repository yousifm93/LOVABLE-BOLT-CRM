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
    const { file_url } = await req.json();
    
    console.log('[parse-contract] Starting to parse contract using base64 approach');
    console.log('[parse-contract] File URL provided:', file_url ? 'yes' : 'no');
    
    // Download file from signed URL
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('[parse-contract] File downloaded, size:', blob.size, 'type:', blob.type);
    
    // Check file size - limit to 10MB to prevent memory issues
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (blob.size > MAX_SIZE) {
      throw new Error(`File too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Maximum file size is 10MB. Please compress the PDF or reduce the number of pages before uploading.`);
    }
    
    // Convert to base64 using chunked approach to avoid memory issues
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    
    // Process in chunks to avoid stack overflow
    const CHUNK_SIZE = 32768; // 32KB chunks
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
      const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
      for (let j = 0; j < chunk.length; j++) {
        binary += String.fromCharCode(chunk[j]);
      }
    }
    
    const base64 = btoa(binary);
    console.log('[parse-contract] Converted to base64, length:', base64.length);
    
    // Use Lovable AI Gateway with Gemini Vision
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    console.log('[parse-contract] Calling AI Gateway...');
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
            text: `Extract the following information from this real estate purchase contract. Return ONLY a valid JSON object with these fields:

{
  "property_type": "Single Family" | "Condo" | "Townhouse" | "Multi-Family" | "Other",
  "sales_price": NUMBER (without dollar signs or commas),
  "loan_amount": NUMBER (if mentioned, otherwise null),
  "subject_address_1": "Street address line 1",
  "subject_address_2": "Unit/Apt number or null",
  "city": "City name",
  "state": "Two letter state code",
  "zip": "ZIP code",
  "close_date": "YYYY-MM-DD format or null",
  "finance_contingency": "YYYY-MM-DD format or null - CALCULATE THIS AS DESCRIBED BELOW",
  "buyer_agent": {
    "first_name": "string or null",
    "last_name": "string or null",
    "phone": "string or null",
    "email": "string or null",
    "brokerage": "string or null"
  },
  "listing_agent": {
    "first_name": "string or null",
    "last_name": "string or null", 
    "phone": "string or null",
    "email": "string or null",
    "brokerage": "string or null"
  }
}

IMPORTANT INSTRUCTIONS:

1. DO NOT extract down_payment or deposit amounts - ignore any deposit/earnest money fields.

2. For finance_contingency date - YOU MUST CALCULATE IT:
   - First, find Section 3 "TIME FOR ACCEPTANCE OF OFFER" to get the Effective Date
   - Then, find Section 8 "FINANCING":
     * If checkbox (a) "CASH (no financing)" is checked → finance_contingency = null
     * If checkbox (b) is checked (financing contingency) → Look for the number of days (usually says "within ___ days after Effective Date" - default is 30 if blank)
     * CALCULATE: finance_contingency = Effective Date + the number of days from option (b)
   - Example: If Effective Date is December 3, 2024 and option (b) says "within 30 days", then finance_contingency = January 2, 2025

3. For property_type, infer from context (single family home, condominium, townhouse, etc.)
4. Look for "Purchase Price", "Sales Price", or "Contract Price" for sales_price
5. Look for financing terms for loan_amount
6. Look for "Closing Date", "Settlement Date", or "Close of Escrow" for close_date
7. Extract agent information from buyer's agent and listing/seller's agent sections

Return ONLY the JSON object, no additional text`
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
      console.error('[parse-contract] AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;
    
    console.log('[parse-contract] AI response content:', content);
    
    // Parse the extracted data
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract contract data from AI response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[parse-contract] Successfully extracted contract data:', JSON.stringify(parsed));

    // Initialize Supabase client for agent operations ONLY
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process buyer's agent - search or create
    let buyer_agent_id = null;
    let buyer_agent_created = false;
    if (parsed.buyer_agent?.first_name && parsed.buyer_agent?.last_name) {
      console.log('[parse-contract] Processing buyer agent:', parsed.buyer_agent);
      
      // Search for existing agent
      const { data: existingBuyerAgents } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name')
        .ilike('first_name', parsed.buyer_agent.first_name)
        .ilike('last_name', parsed.buyer_agent.last_name)
        .limit(1);

      if (existingBuyerAgents && existingBuyerAgents.length > 0) {
        buyer_agent_id = existingBuyerAgents[0].id;
        console.log('[parse-contract] Found existing buyer agent:', buyer_agent_id);
      } else {
        // Create new agent
        const { data: newAgent, error: createError } = await supabase
          .from('buyer_agents')
          .insert({
            first_name: parsed.buyer_agent.first_name,
            last_name: parsed.buyer_agent.last_name,
            phone: parsed.buyer_agent.phone,
            email: parsed.buyer_agent.email,
            brokerage: parsed.buyer_agent.brokerage || 'Unknown'
          })
          .select('id')
          .single();

        if (newAgent) {
          buyer_agent_id = newAgent.id;
          buyer_agent_created = true;
          console.log('[parse-contract] Created new buyer agent:', buyer_agent_id);
        } else {
          console.error('[parse-contract] Failed to create buyer agent:', createError);
        }
      }
    }

    // Process listing agent - search or create
    let listing_agent_id = null;
    let listing_agent_created = false;
    if (parsed.listing_agent?.first_name && parsed.listing_agent?.last_name) {
      console.log('[parse-contract] Processing listing agent:', parsed.listing_agent);
      
      // Search for existing agent
      const { data: existingListingAgents } = await supabase
        .from('buyer_agents')
        .select('id, first_name, last_name')
        .ilike('first_name', parsed.listing_agent.first_name)
        .ilike('last_name', parsed.listing_agent.last_name)
        .limit(1);

      if (existingListingAgents && existingListingAgents.length > 0) {
        listing_agent_id = existingListingAgents[0].id;
        console.log('[parse-contract] Found existing listing agent:', listing_agent_id);
      } else {
        // Create new agent
        const { data: newAgent, error: createError } = await supabase
          .from('buyer_agents')
          .insert({
            first_name: parsed.listing_agent.first_name,
            last_name: parsed.listing_agent.last_name,
            phone: parsed.listing_agent.phone,
            email: parsed.listing_agent.email,
            brokerage: parsed.listing_agent.brokerage || 'Unknown'
          })
          .select('id')
          .single();

        if (newAgent) {
          listing_agent_id = newAgent.id;
          listing_agent_created = true;
          console.log('[parse-contract] Created new listing agent:', listing_agent_id);
        } else {
          console.error('[parse-contract] Failed to create listing agent:', createError);
        }
      }
    }

    // DO NOT update the lead - just return extracted data for client confirmation
    console.log('[parse-contract] Returning extracted data for client confirmation');

    return new Response(JSON.stringify({ 
      success: true, 
      extracted_data: parsed,
      buyer_agent_id,
      buyer_agent_created,
      listing_agent_id,
      listing_agent_created
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[parse-contract] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
