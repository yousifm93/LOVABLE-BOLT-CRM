import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioData {
  fico_score: number;
  citizenship: string;
  dti: string;
  property_type: string;
  num_units: number;
  occupancy: string;
  state: string;
  program_type: string;
  loan_type: string;
  amortization_type: string;
  loan_purpose: string;
  loan_amount: number;
  ltv: number;
  lock_period: number;
  broker_compensation: string;
  admin_fee_buyout: boolean;
  escrow_waiver: boolean;
  high_balance: boolean;
  sub_financing: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let browser;

  try {
    const { run_id } = await req.json();
    console.log('[loan-pricer-scraper] Starting run:', run_id);

    if (!run_id) {
      throw new Error('run_id is required');
    }

    // Fetch the pricing run
    const { data: pricingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (fetchError || !pricingRun) {
      throw new Error(`Failed to fetch pricing run: ${fetchError?.message}`);
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

    // Launch browser
    console.log('[loan-pricer-scraper] Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to pricing website
    console.log('[loan-pricer-scraper] Navigating to pricing website...');
    await page.goto('https://pricer.admortgage.com/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('[loan-pricer-scraper] Page loaded successfully');

    // Wait for form to be ready
    await page.waitForSelector('select, input[type="range"], input[type="text"]', { timeout: 10000 });

    // Fill in form fields - these selectors will need to be adjusted based on actual website
    console.log('[loan-pricer-scraper] Filling form fields...');

    // Program Type dropdown
    await page.select('select[name="program"], select#program, select[id*="program"]', scenarioData.program_type);

    // Loan Type dropdown (Fixed/ARM)
    await page.select('select[name="loanType"], select#loanType, select[id*="loanType"]', scenarioData.loan_type);

    // Citizenship
    await page.select('select[name="citizenship"], select#citizenship', scenarioData.citizenship);

    // Occupancy
    await page.select('select[name="occupancy"], select#occupancy', scenarioData.occupancy);

    // Purpose
    await page.select('select[name="purpose"], select#purpose', scenarioData.loan_purpose);

    // Property Type
    await page.select('select[name="propertyType"], select#propertyType', scenarioData.property_type);

    // Number of Units
    await page.select('select[name="numUnits"], select#numUnits', scenarioData.num_units.toString());

    // DTI
    await page.select('select[name="dti"], select#dti', scenarioData.dti);

    // Amortization Type
    await page.select('select[name="amortization"], select#amortization', scenarioData.amortization_type);

    // Lock Period
    await page.select('select[name="lockPeriod"], select#lockPeriod', scenarioData.lock_period.toString());

    // Broker Compensation
    await page.select('select[name="brokerComp"], select#brokerComp', scenarioData.broker_compensation);

    // FICO Score slider
    await page.evaluate((value) => {
      const slider = document.querySelector('input[name="fico"], input#fico, input[type="range"][id*="fico"]') as HTMLInputElement;
      if (slider) {
        slider.value = value.toString();
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, scenarioData.fico_score);

    // LTV slider
    await page.evaluate((value) => {
      const slider = document.querySelector('input[name="ltv"], input#ltv, input[type="range"][id*="ltv"]') as HTMLInputElement;
      if (slider) {
        slider.value = value.toString();
        slider.dispatchEvent(new Event('input', { bubbles: true }));
        slider.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, scenarioData.ltv);

    // Loan Amount
    await page.type('input[name="loanAmount"], input#loanAmount', scenarioData.loan_amount.toString());

    // Checkboxes
    if (scenarioData.admin_fee_buyout) {
      await page.click('input[name="adminFeeBuyout"], input#adminFeeBuyout');
    }
    if (scenarioData.escrow_waiver) {
      await page.click('input[name="escrowWaiver"], input#escrowWaiver');
    }
    if (scenarioData.high_balance) {
      await page.click('input[name="highBalance"], input#highBalance');
    }
    if (scenarioData.sub_financing) {
      await page.click('input[name="subFinancing"], input#subFinancing');
    }

    console.log('[loan-pricer-scraper] Form filled, submitting...');

    // Click submit button
    await page.click('button[type="submit"], button#calculate, button.calculate-btn, input[type="submit"]');

    // Wait for results to appear
    console.log('[loan-pricer-scraper] Waiting for results...');
    await page.waitForSelector('.results, .pricing-results, #results, [class*="result"]', { 
      timeout: 30000 
    });

    // Give extra time for all results to load
    await page.waitForTimeout(2000);

    // Extract pricing data
    console.log('[loan-pricer-scraper] Extracting results...');
    const results = await page.evaluate(() => {
      // These selectors will need to be adjusted based on actual website
      const getTextContent = (selector: string): string => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };

      return {
        rate: getTextContent('.rate, .interest-rate, [class*="rate"]'),
        monthly_payment: getTextContent('.payment, .monthly-payment, [class*="payment"]'),
        discount_points: getTextContent('.points, .discount-points, [class*="points"]'),
        program_name: getTextContent('.program-name, [class*="program"]'),
        apr: getTextContent('.apr, [class*="apr"]'),
        pricing_as_of: getTextContent('.timestamp, .pricing-date, [class*="date"]'),
        scraped_at: new Date().toISOString()
      };
    });

    console.log('[loan-pricer-scraper] Results extracted:', results);

    // Update pricing run with results
    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        results_json: results,
        error_message: null
      })
      .eq('id', run_id);

    if (updateError) {
      console.error('[loan-pricer-scraper] Error updating results:', updateError);
    }

    await browser.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: 'Pricing data scraped successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[loan-pricer-scraper] Error:', error);

    // Try to update status to failed
    try {
      const { run_id } = await req.json();
      if (run_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Get current retry count
        const { data: currentRun } = await supabase
          .from('pricing_runs')
          .select('retry_count')
          .eq('id', run_id)
          .single();

        const retryCount = (currentRun?.retry_count || 0) + 1;
        const shouldRetry = retryCount < 3;

        await supabase
          .from('pricing_runs')
          .update({
            status: shouldRetry ? 'pending' : 'failed',
            error_message: error.message,
            retry_count: retryCount
          })
          .eq('id', run_id);
      }
    } catch (updateError) {
      console.error('[loan-pricer-scraper] Error updating failed status:', updateError);
    }

    if (browser) {
      await browser.close();
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
