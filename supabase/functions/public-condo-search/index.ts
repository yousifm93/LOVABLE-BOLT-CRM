import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const searchQuery = url.searchParams.get("q") || "";
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query - search by condo name or address
    let query = supabase
      .from('condos')
      .select('condo_name, street_address, city, state, zip, primary_down, second_down, investment_down, source_uwm, source_ad, past_mb_closing')
      .limit(Math.min(limit, 50)); // Cap at 50 results for performance

    // Apply search filter if query provided
    if (searchQuery.trim()) {
      query = query.or(`condo_name.ilike.%${searchQuery}%,street_address.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error:", error);
      throw error;
    }

    // Transform data for public consumption (limited fields only)
    const publicResults = (data || []).map(condo => ({
      name: condo.condo_name,
      address: [condo.street_address, condo.city, condo.state, condo.zip]
        .filter(Boolean)
        .join(', ') || null,
      downPayments: {
        primary: condo.primary_down || 'N/A',
        secondHome: condo.second_down || 'N/A',
        investment: condo.investment_down || 'N/A',
      },
      approvals: {
        uwm: condo.source_uwm || false,
        ad: condo.source_ad || false,
      },
      pastMbClosing: condo.past_mb_closing || false,
    }));

    return new Response(
      JSON.stringify({ 
        results: publicResults, 
        count: publicResults.length,
        query: searchQuery 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in public-condo-search:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
