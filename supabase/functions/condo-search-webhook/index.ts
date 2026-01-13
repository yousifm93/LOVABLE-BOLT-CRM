import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SaleResult {
  unit?: string;
  close_date?: string;
  sold_price?: number;
  mortgage_amount?: number;
  lender_name?: string;
  loan_type?: string;
}

interface WebhookPayload {
  search_id: string;
  status: "completed" | "failed";
  results?: SaleResult[];
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: WebhookPayload = await req.json();
    
    console.log(`Received webhook payload: ${JSON.stringify(payload)}`);

    const { search_id, status, results, error_message } = payload;

    if (!search_id) {
      throw new Error("search_id is required");
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: status || "completed",
      completed_at: new Date().toISOString(),
    };

    if (results && Array.isArray(results)) {
      // Parse and clean the results
      const cleanedResults = results.map((result) => ({
        unit: result.unit || null,
        close_date: result.close_date || null,
        sold_price: typeof result.sold_price === "number" 
          ? result.sold_price 
          : parseFloat(String(result.sold_price).replace(/[^0-9.-]/g, "")) || null,
        mortgage_amount: typeof result.mortgage_amount === "number"
          ? result.mortgage_amount
          : parseFloat(String(result.mortgage_amount).replace(/[^0-9.-]/g, "")) || null,
        lender_name: result.lender_name || null,
        loan_type: result.loan_type || null,
      }));

      updateData.results_json = { sales: cleanedResults };
      console.log(`Processed ${cleanedResults.length} sale results`);
    }

    if (error_message) {
      updateData.error_message = error_message;
      updateData.status = "failed";
    }

    // Update the search record
    const { error: updateError } = await supabase
      .from("condo_searches")
      .update(updateData)
      .eq("id", search_id);

    if (updateError) {
      console.error(`Failed to update search: ${updateError.message}`);
      throw new Error(`Failed to update search: ${updateError.message}`);
    }

    console.log(`Successfully updated search ${search_id} with status: ${updateData.status}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook processed successfully" 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in condo-search-webhook:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
