import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Define the lender schema for the AI
const LENDER_SCHEMA = `
Lenders table has these key fields:
- lender_name (text): Name of the lender
- lender_type (text): "Conventional", "Non-QM", "Private", or "HELOC"
- status (text): "Active", "Pending", or "Inactive"
- notes (text): Free-form notes about the lender
- special_features (text[]): Array of special features
- restrictions (text[]): Array of restrictions

Product fields (all text, values are "Y", "N", or "TBD"):
- product_fha, product_va, product_conv, product_jumbo
- product_bs_loan (Bank Statement loans)
- product_wvoe (WVOE)
- product_1099_program, product_pl_program (P&L Program)
- product_itin (ITIN loans)
- product_dpa (Down Payment Assistance)
- product_heloc, product_inv_heloc, product_fn_heloc, product_nonqm_heloc
- product_manufactured_homes
- product_coop, product_condo_hotel
- product_high_dti (High DTI)
- product_low_fico (Low FICO)
- product_no_credit (No Credit Score)
- product_dr_loan
- product_fn (Foreign National)
- product_nwc (Non-Warrantable Condo)
- product_5_8_unit (5-8 Unit properties)
- product_9_plus_unit (9+ Unit properties)
- product_commercial, product_construction, product_land_loan
- product_fthb_dscr (First Time Homebuyer DSCR)
- product_no_income_primary
- product_no_seasoning_cor (No Seasoning Cash-Out Refi)
- product_tbd_uw (TBD Underwriting)
- product_condo_review_desk, product_condo_mip_issues
- product_558, product_wvoe_family
- product_1099_less_1yr, product_1099_no_biz
- product_omit_student_loans, product_no_ratio_dscr

LTV fields (all numeric percentages):
- max_ltv, conv_max_ltv, fha_max_ltv, jumbo_max_ltv
- bs_loan_max_ltv, wvoe_max_ltv, dscr_max_ltv
- ltv_1099, pl_max_ltv, fn_max_ltv
- heloc_max_ltv, condo_inv_max_ltv

Number fields:
- min_loan_amount, max_loan_amount (currency)
- min_fico, heloc_min_fico (credit scores)
- min_sqft, condotel_min_sqft (square feet)
- asset_dep_months (months)
- heloc_min, max_cash_out_70_ltv (currency)
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: "Query is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Use Lovable AI to understand the query and generate search criteria
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a mortgage lender database search assistant. Given a natural language query, extract search criteria for finding lenders.

${LENDER_SCHEMA}

Respond with a JSON object containing:
- filters: An array of filter conditions, each with:
  - field: The database field name
  - operator: "eq" (equals), "gte" (>=), "lte" (<=), "contains" (text search), "array_contains" (for text[] fields)
  - value: The value to match
- text_search: Array of text terms to search in notes, special_features, and restrictions
- explanation: A brief explanation of what you're searching for

Example for "lenders that do non-warrantable condos":
{
  "filters": [{"field": "product_nwc", "operator": "eq", "value": "Y"}],
  "text_search": ["non-warrantable", "nwc"],
  "explanation": "Searching for lenders that offer Non-Warrantable Condo (NWC) products"
}

Example for "lenders with 80% LTV on bank statement loans":
{
  "filters": [
    {"field": "product_bs_loan", "operator": "eq", "value": "Y"},
    {"field": "bs_loan_max_ltv", "operator": "gte", "value": 80}
  ],
  "text_search": [],
  "explanation": "Searching for lenders offering Bank Statement loans with at least 80% LTV"
}

Only return the JSON object, no markdown or other formatting.`
          },
          {
            role: "user",
            content: query
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "search_lenders",
              description: "Search for lenders based on criteria",
              parameters: {
                type: "object",
                properties: {
                  filters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        field: { type: "string" },
                        operator: { type: "string", enum: ["eq", "gte", "lte", "contains", "array_contains"] },
                        value: { type: ["string", "number"] }
                      },
                      required: ["field", "operator", "value"]
                    }
                  },
                  text_search: {
                    type: "array",
                    items: { type: "string" }
                  },
                  explanation: { type: "string" }
                },
                required: ["filters", "explanation"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "search_lenders" } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log("[ai-lender-search] AI response:", JSON.stringify(aiData));

    let searchCriteria;
    try {
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        searchCriteria = JSON.parse(toolCall.function.arguments);
      } else {
        // Fallback: try to parse from content
        const content = aiData.choices?.[0]?.message?.content || "{}";
        searchCriteria = JSON.parse(content);
      }
    } catch (e) {
      console.error("[ai-lender-search] Failed to parse AI response:", e);
      // Default to text search only
      searchCriteria = {
        filters: [],
        text_search: query.split(/\s+/).filter((w: string) => w.length > 2),
        explanation: "Performing a text search for your query"
      };
    }

    console.log("[ai-lender-search] Search criteria:", JSON.stringify(searchCriteria));

    // Build the Supabase query
    let dbQuery = supabase
      .from('lenders')
      .select('id, lender_name, lender_type, status, notes, special_features, restrictions, account_executive_email')
      .is('deleted_at', null)
      .eq('status', 'Active');

    // Apply structured filters
    for (const filter of searchCriteria.filters || []) {
      switch (filter.operator) {
        case 'eq':
          dbQuery = dbQuery.eq(filter.field, filter.value);
          break;
        case 'gte':
          dbQuery = dbQuery.gte(filter.field, filter.value);
          break;
        case 'lte':
          dbQuery = dbQuery.lte(filter.field, filter.value);
          break;
        case 'contains':
          dbQuery = dbQuery.ilike(filter.field, `%${filter.value}%`);
          break;
        case 'array_contains':
          dbQuery = dbQuery.contains(filter.field, [filter.value]);
          break;
      }
    }

    const { data: lenders, error: dbError } = await dbQuery.order('lender_name');

    if (dbError) {
      console.error("[ai-lender-search] Database error:", dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    // Apply text search on notes, special_features, restrictions
    let results = lenders || [];
    const textTerms = searchCriteria.text_search || [];
    
    if (textTerms.length > 0 && results.length > 0) {
      results = results.filter((lender: any) => {
        const searchableText = [
          lender.notes || '',
          ...(lender.special_features || []),
          ...(lender.restrictions || [])
        ].join(' ').toLowerCase();
        
        return textTerms.some((term: string) => 
          searchableText.includes(term.toLowerCase())
        );
      });
    }

    // If no structured results but we have text terms, do a broader text search
    if (results.length === 0 && textTerms.length > 0) {
      const { data: textResults } = await supabase
        .from('lenders')
        .select('id, lender_name, lender_type, status, notes, special_features, restrictions, account_executive_email')
        .is('deleted_at', null)
        .eq('status', 'Active')
        .or(textTerms.map((t: string) => `notes.ilike.%${t}%`).join(','))
        .order('lender_name');
      
      results = textResults || [];
    }

    return new Response(
      JSON.stringify({
        lender_ids: results.map((l: any) => l.id),
        lenders: results.map((l: any) => ({
          id: l.id,
          lender_name: l.lender_name,
          lender_type: l.lender_type,
          has_email: !!l.account_executive_email
        })),
        matching_criteria: JSON.stringify(searchCriteria.filters),
        explanation: searchCriteria.explanation,
        result_count: results.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-lender-search] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
