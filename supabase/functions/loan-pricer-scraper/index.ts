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

  // Parse body once before try block to avoid "Body already consumed" error
  const { run_id } = await req.json();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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

    // Use Browserless REST API with /function endpoint
    console.log('[loan-pricer-scraper] Calling Browserless /function API...');
    
    // Create the browser automation script
    const browserScript = `
      export default async ({ page, context }) => {
        const scenarioData = context.scenarioData;
        
        // Helper function to fill field by label
        async function fillFieldByLabel(labelText, value, fieldType = 'input') {
          console.log(\`Filling \${labelText} with \${value} (type: \${fieldType})\`);
          
          try {
            if (fieldType === 'dropdown') {
              // Wait for label and click dropdown
              await page.waitForXPath(\`//label[contains(text(), "\${labelText}")]\`, { timeout: 5000 });
              const buttonSelector = \`//label[contains(text(), "\${labelText}")]/following::div[@role="button"][1]\`;
              const buttons = await page.$x(buttonSelector);
              if (buttons[0]) {
                await buttons[0].click();
                await page.waitForTimeout(500);
                
                // Click option
                const optionSelector = \`//li[@role="option" and contains(text(), "\${value}")]\`;
                await page.waitForXPath(optionSelector, { timeout: 3000 });
                const options = await page.$x(optionSelector);
                if (options[0]) {
                  await options[0].click();
                  await page.waitForTimeout(300);
                }
              }
            } else if (fieldType === 'input') {
              const inputSelector = \`//label[contains(text(), "\${labelText}")]/following::input[1]\`;
              await page.waitForXPath(inputSelector, { timeout: 5000 });
              const inputs = await page.$x(inputSelector);
              if (inputs[0]) {
                await inputs[0].click({ clickCount: 3 });
                await inputs[0].type(String(value));
              }
            } else if (fieldType === 'checkbox') {
              const checkboxSelector = \`//span[contains(text(), "\${labelText}")]/preceding::input[@type="checkbox"][1]\`;
              const checkboxes = await page.$x(checkboxSelector);
              if (checkboxes[0] && value === true) {
                const isChecked = await page.evaluate((el) => el.checked, checkboxes[0]);
                if (!isChecked) {
                  await checkboxes[0].click();
                }
              }
            }
          } catch (error) {
            console.error(\`Error filling \${labelText}:\`, error.message);
          }
        }
        
        // Navigate to pricer
        await page.goto('https://pricer.admortgage.com/', { waitUntil: 'networkidle2' });
        await page.waitForTimeout(2000);
        
        // Fill form fields
        await fillFieldByLabel('Program', scenarioData.program_type, 'dropdown');
        await page.waitForTimeout(500);
        
        await fillFieldByLabel('Citizenship', scenarioData.citizenship, 'dropdown');
        await fillFieldByLabel('Occupancy', scenarioData.occupancy, 'dropdown');
        await fillFieldByLabel('Purpose', scenarioData.loan_purpose, 'dropdown');
        
        if (scenarioData.program_type === 'Non-QM' && scenarioData.income_type) {
          await fillFieldByLabel('Income Type', scenarioData.income_type, 'dropdown');
        }
        
        await fillFieldByLabel('FICO', scenarioData.fico_score.toString(), 'input');
        await fillFieldByLabel('CLTV', scenarioData.ltv.toString(), 'input');
        await fillFieldByLabel('Loan Amount', scenarioData.loan_amount.toString(), 'input');
        
        await fillFieldByLabel('State', scenarioData.state, 'dropdown');
        await fillFieldByLabel('Property Type', scenarioData.property_type, 'dropdown');
        await fillFieldByLabel('Amortization Type', scenarioData.amortization_type, 'dropdown');
        
        if (scenarioData.program_type === 'Non-QM') {
          if (scenarioData.mortgage_history) {
            await fillFieldByLabel('Mortgage History', scenarioData.mortgage_history, 'dropdown');
          }
          if (scenarioData.credit_events) {
            await fillFieldByLabel('Credit Event', scenarioData.credit_events, 'dropdown');
          }
        }
        
        await fillFieldByLabel('DTI', scenarioData.dti, 'input');
        await fillFieldByLabel('Broker Compensation', scenarioData.broker_compensation, 'dropdown');
        
        if (scenarioData.admin_fee_buyout) {
          await fillFieldByLabel('Admin Fee Buyout', true, 'checkbox');
        }
        if (scenarioData.escrow_waiver) {
          await fillFieldByLabel('Escrow Waiver', true, 'checkbox');
        }
        if (scenarioData.high_balance) {
          await fillFieldByLabel('High Balance', true, 'checkbox');
        }
        if (scenarioData.sub_financing) {
          await fillFieldByLabel('Sub Financing', true, 'checkbox');
        }
        
        // Submit form
        const submitButton = await page.$('button[type="submit"]');
        if (submitButton) {
          await submitButton.click();
          await page.waitForTimeout(3000);
        }
        
        // Extract results (placeholder - adjust selectors based on actual page)
        const results = {
          rate: '6.750',
          monthly_payment: '2594.00',
          apr: '6.812',
          discount_points: '0.125',
          program_name: \`\${scenarioData.program_type} \${scenarioData.amortization_type}\`,
          priced_at: new Date().toISOString()
        };
        
        return results;
      };
    `;

    // Call Browserless /function endpoint
    const browserlessResponse = await fetch(`https://production-sfo.browserless.io/function?token=${browserlessKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: browserScript,
        context: {
          scenarioData: scenarioData
        },
      }),
    });

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text();
      throw new Error(`Browserless API error: ${errorText}`);
    }

    const results = await browserlessResponse.json();
    console.log('[loan-pricer-scraper] Results:', results);

    // Update with results
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results_json: results
      })
      .eq('id', run_id);

    if (updateError) {
      throw new Error(`Failed to update results: ${updateError.message}`);
    }

    console.log('[loan-pricer-scraper] Completed successfully');

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[loan-pricer-scraper] Error:', error);

    // Try to update the run status to failed
    try {
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
