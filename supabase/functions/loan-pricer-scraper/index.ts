import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioData {
  // Borrower
  fico_score: number;
  citizenship: string;
  dti: string;
  
  // Property
  property_type: string;
  num_units: number;
  occupancy: string;
  state: string;
  
  // Loan
  program_type: string;
  loan_type: string;
  amortization_type: string;
  loan_purpose: string;
  loan_amount: number;
  ltv: number;
  
  // Additional
  lock_period: number;
  broker_compensation: string;
  admin_fee_buyout: boolean;
  escrow_waiver: boolean;
  high_balance: boolean;
  sub_financing: boolean;
  
  // Non-QM specific (optional)
  income_type?: string;
  mortgage_history?: string;
  credit_events?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { run_id } = await req.json();
    console.log('[loan-pricer-scraper] Starting run:', run_id);

    // Fetch the pricing run
    const { data: pricingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch pricing run: ${fetchError.message}`);
    }

    const scenarioData = pricingRun.scenario_json as ScenarioData;
    console.log('[loan-pricer-scraper] Scenario:', scenarioData);

    // Update status to running
    await supabase
      .from('pricing_runs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', run_id);

    // TODO: Replace this with actual web scraping using Browserless.io
    // 
    // Implementation steps:
    // 1. Sign up for Browserless.io (recommended) - https://www.browserless.io/
    // 2. Add BROWSERLESS_API_KEY secret to Supabase Edge Functions
    // 3. Connect to Browserless: wss://chrome.browserless.io?token=${BROWSERLESS_API_KEY}
    // 4. Navigate to https://pricer.admortgage.com/
    // 5. Fill in all form fields using CSS selectors
    // 6. For Non-QM scenarios, check if program_type === "Non-QM" and fill additional fields:
    //    - income_type (wait for selector to appear after selecting Non-QM)
    //    - mortgage_history
    //    - credit_events
    // 7. Submit form and extract results
    //
    // Pseudocode for Non-QM handling:
    // if (scenarioData.program_type === "Non-QM") {
    //   await page.waitForSelector('#income-type-selector', { timeout: 5000 });
    //   if (scenarioData.income_type) {
    //     await page.select('#income-type-selector', scenarioData.income_type);
    //   }
    //   if (scenarioData.mortgage_history) {
    //     await page.select('#mortgage-history-selector', scenarioData.mortgage_history);
    //   }
    //   if (scenarioData.credit_events) {
    //     await page.select('#credit-events-selector', scenarioData.credit_events);
    //   }
    // }
    
    console.log('[loan-pricer-scraper] Note: Using mock data - web scraping not yet implemented');
    console.log('[loan-pricer-scraper] Scenario data:', JSON.stringify(scenarioData, null, 2));
    
    // Mock results (replace with actual scraping)
    const mockResults = {
      rate: scenarioData.program_type === "Non-QM" ? '7.250' : '6.750',
      monthly_payment: scenarioData.program_type === "Non-QM" ? '2735.00' : '2594.00',
      discount_points: '0.125',
      apr: scenarioData.program_type === "Non-QM" ? '7.312' : '6.812',
      program_name: `${scenarioData.program_type} ${scenarioData.amortization_type}`,
      priced_at: new Date().toISOString(),
      // Include Non-QM details in results for debugging
      ...(scenarioData.program_type === "Non-QM" && {
        non_qm_details: {
          income_type: scenarioData.income_type,
          mortgage_history: scenarioData.mortgage_history,
          credit_events: scenarioData.credit_events
        }
      })
    };

    // Update with results
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results_json: mockResults
      })
      .eq('id', run_id);

    if (updateError) {
      throw new Error(`Failed to update results: ${updateError.message}`);
    }

    console.log('[loan-pricer-scraper] Completed successfully');

    return new Response(
      JSON.stringify({ success: true, results: mockResults }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[loan-pricer-scraper] Error:', error);

    // Try to update the run status to failed
    try {
      const { run_id } = await req.json();
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from('pricing_runs')
        .update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', run_id);
    } catch (updateError) {
      console.error('[loan-pricer-scraper] Error updating failed status:', updateError);
    }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
