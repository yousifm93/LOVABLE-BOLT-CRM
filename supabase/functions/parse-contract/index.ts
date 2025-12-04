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
    
    console.log('[parse-contract] Starting to parse contract using URL-based approach');
    
    // Use Lovable AI Gateway with Gemini Vision - pass URL directly
    console.log('[parse-contract] Calling AI Gateway with file URL...');
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
            text: `Extract the following information from this real estate purchase contract. Return ONLY a valid JSON object with these fields:

{
  "property_type": "Single Family" | "Condo" | "Townhouse" | "Multi-Family" | "Other",
  "sales_price": NUMBER (without dollar signs or commas),
  "loan_amount": NUMBER (if mentioned, otherwise null),
  "down_payment": NUMBER (if mentioned, otherwise null),
  "subject_address_1": "Street address line 1",
  "subject_address_2": "Unit/Apt number or null",
  "city": "City name",
  "state": "Two letter state code",
  "zip": "ZIP code",
  "close_date": "YYYY-MM-DD format or null",
  "finance_contingency": "YYYY-MM-DD format or null (look for financing contingency deadline)",
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

Important:
- For property_type, infer from context (single family home, condominium, townhouse, etc.)
- Look for "Purchase Price", "Sales Price", or "Contract Price" for sales_price
- Look for financing terms for loan_amount and down_payment
- Look for "Closing Date", "Settlement Date", or "Close of Escrow" for close_date
- Look for "Financing Contingency" deadline date
- Extract agent information from buyer's agent and listing/seller's agent sections
- Return ONLY the JSON object, no additional text`
          }, {
            type: 'image_url',
            image_url: {
              url: file_url
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

    // Initialize Supabase client for agent operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process buyer's agent - search or create
    let buyer_agent_id = null;
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
          console.log('[parse-contract] Created new buyer agent:', buyer_agent_id);
        } else {
          console.error('[parse-contract] Failed to create buyer agent:', createError);
        }
      }
    }

    // Process listing agent - search or create
    let listing_agent_id = null;
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
          console.log('[parse-contract] Created new listing agent:', listing_agent_id);
        } else {
          console.error('[parse-contract] Failed to create listing agent:', createError);
        }
      }
    }

    // Update the lead with extracted data
    const leadUpdate: Record<string, any> = {};
    
    if (parsed.property_type) leadUpdate.property_type = parsed.property_type;
    if (parsed.sales_price) leadUpdate.sales_price = parsed.sales_price;
    if (parsed.loan_amount) leadUpdate.loan_amount = parsed.loan_amount;
    // Calculate down payment as sales_price - loan_amount (not parsed from contract)
    if (parsed.sales_price && parsed.loan_amount) {
      leadUpdate.down_pmt = String(parsed.sales_price - parsed.loan_amount);
    }
    if (parsed.subject_address_1) leadUpdate.subject_address_1 = parsed.subject_address_1;
    if (parsed.subject_address_2) leadUpdate.subject_address_2 = parsed.subject_address_2;
    if (parsed.city) leadUpdate.subject_city = parsed.city;
    if (parsed.state) leadUpdate.subject_state = parsed.state;
    if (parsed.zip) leadUpdate.subject_zip = parsed.zip;
    if (parsed.close_date) leadUpdate.close_date = parsed.close_date;
    if (parsed.finance_contingency) leadUpdate.finance_contingency = parsed.finance_contingency;
    if (buyer_agent_id) leadUpdate.buyer_agent_id = buyer_agent_id;
    if (listing_agent_id) leadUpdate.listing_agent_id = listing_agent_id;

    console.log('[parse-contract] Updating lead with:', JSON.stringify(leadUpdate));

    if (Object.keys(leadUpdate).length > 0 && lead_id) {
      const { error: updateError } = await supabase
        .from('leads')
        .update(leadUpdate)
        .eq('id', lead_id);

      if (updateError) {
        console.error('[parse-contract] Failed to update lead:', updateError);
      } else {
        console.log('[parse-contract] Lead updated successfully');
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      extracted_data: parsed,
      buyer_agent_id,
      listing_agent_id,
      fields_updated: Object.keys(leadUpdate)
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
