import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts';

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

// Helper function to fill field by label
async function fillFieldByLabel(page: any, labelText: string, value: string | number | boolean, fieldType: 'dropdown' | 'input' | 'checkbox' = 'input') {
  console.log(`[fillField] ${labelText} = ${value} (type: ${fieldType})`);
  
  try {
    if (fieldType === 'dropdown') {
      // Find the label and navigate to the select button
      const labelSelector = `//label[contains(text(), "${labelText}")]`;
      await page.waitForXPath(labelSelector, { timeout: 5000 });
      
      // Click the dropdown button (Material-UI uses div with role="button")
      const buttonSelector = `//label[contains(text(), "${labelText}")]/following::div[@role="button"][1]`;
      const [button] = await page.$x(buttonSelector);
      if (button) {
        await button.click();
        await page.waitForTimeout(500); // Wait for menu to open
        
        // Click the option with matching text
        const optionSelector = `//li[@role="option" and contains(text(), "${value}")]`;
        await page.waitForXPath(optionSelector, { timeout: 3000 });
        const [option] = await page.$x(optionSelector);
        if (option) {
          await option.click();
          await page.waitForTimeout(300); // Wait for menu to close
        }
      }
    } else if (fieldType === 'input') {
      // Find input by label
      const inputSelector = `//label[contains(text(), "${labelText}")]/following::input[1]`;
      await page.waitForXPath(inputSelector, { timeout: 5000 });
      const [input] = await page.$x(inputSelector);
      if (input) {
        await input.click({ clickCount: 3 }); // Select all
        await input.type(String(value));
      }
    } else if (fieldType === 'checkbox') {
      // Find checkbox by label
      const checkboxSelector = `//span[contains(text(), "${labelText}")]/preceding::input[@type="checkbox"][1]`;
      const [checkbox] = await page.$x(checkboxSelector);
      if (checkbox && value === true) {
        const isChecked = await page.evaluate((el: any) => el.checked, checkbox);
        if (!isChecked) {
          await checkbox.click();
        }
      }
    }
  } catch (error) {
    console.error(`[fillField] Error filling ${labelText}:`, error.message);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const browserlessKey = Deno.env.get('BROWSERLESS_API_KEY')!;
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

    // Connect to Browserless.io
    console.log('[loan-pricer-scraper] Connecting to Browserless...');
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=${browserlessKey}`,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    try {
      // Navigate to the pricer
      console.log('[loan-pricer-scraper] Navigating to pricer...');
      await page.goto('https://pricer.admortgage.com/', { waitUntil: 'networkidle2' });
      await page.waitForTimeout(2000); // Wait for page to fully load

      // Fill form fields in order
      console.log('[loan-pricer-scraper] Filling form fields...');
      
      // Step 1: Program (this may trigger Non-QM fields)
      await fillFieldByLabel(page, 'Program', scenarioData.program_type, 'dropdown');
      await page.waitForTimeout(500); // Wait for conditional fields to appear
      
      // Step 2: Basic borrower info
      await fillFieldByLabel(page, 'Citizenship', scenarioData.citizenship, 'dropdown');
      await fillFieldByLabel(page, 'Occupancy', scenarioData.occupancy, 'dropdown');
      await fillFieldByLabel(page, 'Purpose', scenarioData.loan_purpose, 'dropdown');
      
      // Step 3: Income Type (if Non-QM)
      if (scenarioData.program_type === 'Non-QM' && scenarioData.income_type) {
        await fillFieldByLabel(page, 'Income Type', scenarioData.income_type, 'dropdown');
      }
      
      // Step 4: Financial details
      await fillFieldByLabel(page, 'FICO', scenarioData.fico_score.toString(), 'input');
      await fillFieldByLabel(page, 'CLTV', scenarioData.ltv.toString(), 'input');
      await fillFieldByLabel(page, 'Loan Amount', scenarioData.loan_amount.toString(), 'input');
      
      // Step 5: Property and loan details
      await fillFieldByLabel(page, 'State', scenarioData.state, 'dropdown');
      await fillFieldByLabel(page, 'Property Type', scenarioData.property_type, 'dropdown');
      await fillFieldByLabel(page, 'Amortization Type', scenarioData.amortization_type, 'dropdown');
      
      // Step 6: Non-QM specific fields (if applicable)
      if (scenarioData.program_type === 'Non-QM') {
        if (scenarioData.mortgage_history) {
          await fillFieldByLabel(page, 'Mortgage History', scenarioData.mortgage_history, 'dropdown');
        }
        if (scenarioData.credit_events) {
          await fillFieldByLabel(page, 'Credit Event', scenarioData.credit_events, 'dropdown');
        }
      }
      
      // Step 7: Additional fields
      await fillFieldByLabel(page, 'DTI', scenarioData.dti, 'input');
      await fillFieldByLabel(page, 'Broker Compensation', scenarioData.broker_compensation, 'dropdown');
      
      // Step 8: Checkboxes
      if (scenarioData.admin_fee_buyout) {
        await fillFieldByLabel(page, 'Admin Fee Buyout', true, 'checkbox');
      }
      if (scenarioData.escrow_waiver) {
        await fillFieldByLabel(page, 'Escrow Waiver', true, 'checkbox');
      }
      if (scenarioData.high_balance) {
        await fillFieldByLabel(page, 'High Balance', true, 'checkbox');
      }
      if (scenarioData.sub_financing) {
        await fillFieldByLabel(page, 'Sub Financing', true, 'checkbox');
      }

      // Submit form and wait for results
      console.log('[loan-pricer-scraper] Submitting form...');
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(3000); // Wait for results to load
      }

      // Extract results
      console.log('[loan-pricer-scraper] Extracting results...');
      const results = await page.evaluate(() => {
        // Extract pricing data from the results section
        // Adjust selectors based on actual page structure
        const getTextByLabel = (label: string) => {
          const element = document.querySelector(`*:contains("${label}")`);
          return element?.textContent?.trim() || '';
        };
        
        return {
          rate: getTextByLabel('Interest Rate'),
          monthly_payment: getTextByLabel('Monthly Payment'),
          apr: getTextByLabel('APR'),
          discount_points: getTextByLabel('Discount Points'),
          program_name: getTextByLabel('Program Name'),
          priced_at: new Date().toISOString()
        };
      });

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

    } catch (pageError: any) {
      console.error('[loan-pricer-scraper] Page error:', pageError);
      throw pageError;
    } finally {
      // Clean up browser
      await browser.close();
    }

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
