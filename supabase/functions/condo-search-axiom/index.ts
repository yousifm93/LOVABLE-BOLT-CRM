import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { search_id } = await req.json();

    if (!search_id) {
      throw new Error("search_id is required");
    }

    console.log(`Processing condo search: ${search_id}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the search record
    const { data: search, error: fetchError } = await supabase
      .from("condo_searches")
      .select("*")
      .eq("id", search_id)
      .single();

    if (fetchError || !search) {
      throw new Error(`Failed to fetch search record: ${fetchError?.message}`);
    }

    console.log(`Search record found: ${JSON.stringify(search)}`);

    // Update status to running
    const { error: updateError } = await supabase
      .from("condo_searches")
      .update({ status: "running" })
      .eq("id", search_id);

    if (updateError) {
      console.error(`Failed to update status: ${updateError.message}`);
    }

    // Get Axiom API key for condo search (v3 API)
    const axiomApiKey = Deno.env.get("AXIOM_CONDO_KEY") || Deno.env.get("AXIOM_API_KEY");
    if (!axiomApiKey) {
      throw new Error("AXIOM_CONDO_KEY is not configured");
    }

    // Prepare data for Axiom as nested array (same format as Loan Pricer)
    // Format: [[search_id, street_num, direction, street_name, street_type, city, state, zip, days_back, max_results]]
    const axiomData = [[
      search_id,
      search.street_num || "",
      search.direction || "",
      search.street_name || "",
      search.street_type || "",
      search.city || "",
      search.state || "FL",
      search.zip || "",
      (search.days_back || 180).toString(),
      (search.max_results || 10).toString(),
    ]];

    console.log(`Sending to Axiom v3 API: ${JSON.stringify(axiomData)}`);

    // Webhook URL for Axiom to call back with results
    const webhookUrl = `${supabaseUrl}/functions/v1/condo-search-webhook`;

    // Trigger Axiom using the v3 API (key in body, not header)
    const axiomResponse = await fetch("https://lar.axiom.ai/api/v3/trigger", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        key: axiomApiKey,
        name: "Condo Sales Search",
        data: axiomData,
        webhook_url: webhookUrl,
      }),
    });

    const axiomResponseText = await axiomResponse.text();
    console.log(`Axiom API response: ${axiomResponse.status} - ${axiomResponseText}`);

    if (!axiomResponse.ok) {
      // Update status to failed
      await supabase
        .from("condo_searches")
        .update({ 
          status: "failed", 
          error_message: `Axiom API error: ${axiomResponse.status} - ${axiomResponseText}` 
        })
        .eq("id", search_id);

      throw new Error(`Axiom API error: ${axiomResponse.status} - ${axiomResponseText}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Search started",
        search_id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in condo-search-axiom:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
