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
        
        // Normalization maps for field values
        const FIELD_SYNONYMS = {
          program_type: {
            'Conventional': ['Conventional', 'Agency', 'Conforming'],
            'Non-QM': ['Non-QM', 'NonQM', 'Non QM'],
            'FHA': ['FHA'],
            'VA': ['VA'],
            'Prime Jumbo': ['Prime Jumbo', 'Jumbo', 'Prime-Jumbo']
          },
          amortization_type: {
            '30 Year Fixed': ['30 Year Fixed', '30 Yr Fixed', '30-Year Fixed'],
            '25 Year Fixed': ['25 Year Fixed', '25 Yr Fixed', '25-Year Fixed'],
            '20 Year Fixed': ['20 Year Fixed', '20 Yr Fixed', '20-Year Fixed'],
            '15 Year Fixed': ['15 Year Fixed', '15 Yr Fixed', '15-Year Fixed'],
            '10 Year Fixed': ['10 Year Fixed', '10 Yr Fixed', '10-Year Fixed']
          },
          property_type: {
            '1 Unit SFR': ['1 Unit SFR', 'SFR', 'Single Family', '1-Unit', 'Single Family Residence'],
            'Condo': ['Condo', 'Condominium'],
            '2 Unit': ['2 Unit', '2-Unit', 'Duplex'],
            '3 Unit': ['3 Unit', '3-Unit', 'Triplex'],
            '4 Unit': ['4 Unit', '4-Unit', 'Fourplex']
          },
          state: {
            'FL': ['FL', 'Florida']
          },
          broker_compensation: {
            'BPC': ['BPC', 'Broker Paid Compensation'],
            'LPC': ['LPC', 'Lender Paid Compensation']
          }
        };
        
        // Helper: get all synonyms for a field value
        function getSynonyms(fieldType, value) {
          if (!FIELD_SYNONYMS[fieldType]) return [String(value)];
          const mappings = FIELD_SYNONYMS[fieldType];
          for (const [key, synonyms] of Object.entries(mappings)) {
            if (key === value || synonyms.includes(value)) {
              return synonyms;
            }
          }
          return [String(value)];
        }
        
        // Helper: directly type into visible number input field
        async function fillNumberInput(labelText, value) {
          console.log('[NUMBER INPUT] Filling ' + labelText + ' with ' + value);
          
          try {
            // Try multiple strategies to find the visible number input
            const inputSelectors = [
              // Strategy 1: Find input near label
              '//label[contains(text(), "' + labelText + '")]/following-sibling::*//input[@type="number"]',
              '//label[contains(text(), "' + labelText + '")]/following::input[@type="number"][1]',
              '//label[contains(text(), "' + labelText + '")]/preceding::input[@type="number"][1]',
              
              // Strategy 2: Find any text that contains label and nearby input
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::input[@type="number"][1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/..//input[@type="number"]',
              
              // Strategy 3: Generic number inputs (as fallback, be careful)
              '//input[@type="number"]'
            ];
            
            for (const selector of inputSelectors) {
              try {
                const inputs = await page.$x(selector);
                if (inputs.length > 0) {
                  const input = inputs[0];
                  
                  // Scroll into view
                  await input.scrollIntoView();
                  await new Promise(r => setTimeout(r, 150));
                  
                  // Click to focus
                  await input.click();
                  await new Promise(r => setTimeout(r, 100));
                  
                  // Select all existing text (Ctrl+A)
                  await page.keyboard.down('Control');
                  await page.keyboard.press('KeyA');
                  await page.keyboard.up('Control');
                  await new Promise(r => setTimeout(r, 50));
                  
                  // Type new value
                  await page.keyboard.type(String(value), { delay: 50 });
                  await new Promise(r => setTimeout(r, 100));
                  
                  // Press Tab to trigger change and move to next field
                  await page.keyboard.press('Tab');
                  await new Promise(r => setTimeout(r, 200));
                  
                  // Verify the value was set
                  const filledValue = await page.evaluate(el => el.value, input);
                  console.log('[NUMBER INPUT] ✓ ' + labelText + ' set to: ' + filledValue);
                  return true;
                }
              } catch (selectorError) {
                // Try next selector
                continue;
              }
            }
            
            console.warn('[NUMBER INPUT] Could not find input for ' + labelText);
            return false;
          } catch (error) {
            console.error('[NUMBER INPUT] Error filling ' + labelText + ':', error.message);
            return false;
          }
        }
        
        // Helper: dismiss consent overlays
        async function dismissConsent() {
          try {
            const consentSelectors = [
              '//button[contains(., "Accept")]',
              '//button[contains(., "Agree")]',
              '//button[contains(., "I Consent")]',
              '//button[contains(., "OK")]'
            ];
            for (const sel of consentSelectors) {
              const btns = await page.$x(sel);
              if (btns[0]) {
                await btns[0].click();
                console.log('Dismissed consent overlay');
                await new Promise(resolve => setTimeout(resolve, 500));
                return;
              }
            }
          } catch (e) {
            // No consent needed
          }
        }
        
        // Set user agent for stealth
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        // Navigate to pricer
        await page.goto('https://pricer.admortgage.com/', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Dismiss any consent overlays
        await dismissConsent();
        
        // Fill form fields with enhanced logic and synonyms
        await fillFieldByLabel('Program', scenarioData.program_type, 'dropdown', 'program_type');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await fillFieldByLabel('Citizenship', scenarioData.citizenship, 'dropdown');
        await fillFieldByLabel('Occupancy', scenarioData.occupancy, 'dropdown');
        await fillFieldByLabel('Purpose', scenarioData.loan_purpose, 'dropdown');
        
        if (scenarioData.program_type === 'Non-QM' && scenarioData.income_type) {
          await fillFieldByLabel('Income Type', scenarioData.income_type, 'dropdown');
        }
        
        // Fill numeric inputs directly by typing into visible number fields
        console.log('Filling numeric inputs (FICO, LTV, Loan Amount)...');
        await fillNumberInput('FICO', scenarioData.fico_score);
        await fillNumberInput('LTV', scenarioData.ltv);
        await fillNumberInput('Loan Amount', scenarioData.loan_amount);
        
        // Small pause to let UI react (results update dynamically)
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // NEW: Fill Lock Period (was missing before)
        const lockValue = scenarioData.lock_period + ' Days';
        await fillAnyOfLabels(['Lock Period', 'Rate Lock', 'Lock Term'], lockValue, 'dropdown');
        
        // Fill remaining fields with synonyms
        await fillFieldByLabel('State', scenarioData.state, 'dropdown', 'state');
        await fillFieldByLabel('Property Type', scenarioData.property_type, 'dropdown', 'property_type');
        await fillFieldByLabel('Amortization Type', scenarioData.amortization_type, 'dropdown', 'amortization_type');
        
        if (scenarioData.program_type === 'Non-QM') {
          if (scenarioData.mortgage_history) {
            await fillFieldByLabel('Mortgage History', scenarioData.mortgage_history, 'dropdown');
          }
          if (scenarioData.credit_events) {
            await fillFieldByLabel('Credit Event', scenarioData.credit_events, 'dropdown');
          }
        }
        
        await fillFieldByLabel('DTI', scenarioData.dti, 'input');
        await fillFieldByLabel('Broker Compensation', scenarioData.broker_compensation, 'dropdown', 'broker_compensation');
        
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
        
        // Wait for results to update dynamically (no button click needed)
        console.log('Waiting for dynamic results to update...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Verify results are present
        try {
          await page.waitForFunction(() => {
            const text = document.body.innerText || '';
            return /\d+\.\d{2,3}\s*%/.test(text) && /\$\s*[\d,]+\.\d{2}/.test(text);
          }, { timeout: 3000 });
          console.log('✓ Results detected on page');
        } catch (e) {
          console.warn('Results wait timed out, attempting extraction anyway...');
          // Wait a bit more and try
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Verify input values were set correctly
        console.log('Verifying input values...');
        const verification = await page.evaluate(() => {
          const getInputValue = (labelText) => {
            const labels = Array.from(document.querySelectorAll('label'));
            const label = labels.find(l => l.textContent?.includes(labelText));
            if (!label) return 'NOT_FOUND';
            
            // Find nearby number input
            const container = label.parentElement || label;
            const input = container.querySelector('input[type="number"]') ||
                         label.nextElementSibling?.querySelector('input[type="number"]');
            
            return input ? input.value : 'NO_INPUT';
          };
          
          return {
            fico: getInputValue('FICO'),
            ltv: getInputValue('LTV'),
            loanAmount: getInputValue('Loan Amount')
          };
        });
        console.log('Input verification:', JSON.stringify(verification));
        
        // Helper: extract value by label
        function extractByLabel(container, labelText, pattern) {
          try {
            // Find elements containing the label
            const allText = container.innerText || container.textContent || '';
            const lines = allText.split('\\n');
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.toLowerCase().includes(labelText.toLowerCase())) {
                // Check current line and next few lines
                for (let j = i; j < Math.min(i + 4, lines.length); j++) {
                  const match = lines[j].match(pattern);
                  if (match && match[1]) {
                    return match[1];
                  }
                }
              }
            }
            
            // Fallback: search entire container
            const match = allText.match(pattern);
            return match ? match[1] : null;
          } catch (e) {
            return null;
          }
        }
        
        // Extract results from main document with label-directed extraction
        console.log('Extracting pricing results from main document...');
        let results = await page.evaluate((extractByLabelCode) => {
          // Inject helper
          eval('var extractByLabel = ' + extractByLabelCode);
          
          const responseBox = document.querySelector('div.quickPricerBody_response') ||
                              document.querySelector('[class*="quickPricer"][class*="response"]') ||
                              document.querySelector('[class*="response"]') ||
                              document.body;
          
          let allText = responseBox.innerText || responseBox.textContent || '';
          
          const out = {
            rate: 'N/A',
            monthly_payment: 'N/A',
            discount_points: 'N/A',
            apr: 'N/A',
            program_name: 'Quick Pricer Result',
            priced_at: new Date().toISOString(),
            debug_text: allText.substring(0, 800)
          };
          
          // Try label-directed extraction first
          const rateByLabel = extractByLabel(responseBox, 'rate', /(\\d+\\.\\d{2,3})\\s*%/);
          const paymentByLabel = extractByLabel(responseBox, 'payment', /\\$\\s*([\\d,]+\\.\\d{2})/);
          const pointsByLabel = extractByLabel(responseBox, 'points', /([\\-]?\\d+\\.\\d{2,3})/);
          const creditByLabel = extractByLabel(responseBox, 'credit', /([\\-]?\\d+\\.\\d{2,3})/);
          
          if (rateByLabel) out.rate = rateByLabel;
          if (paymentByLabel) out.monthly_payment = paymentByLabel.replace(/,/g, '');
          if (pointsByLabel) out.discount_points = pointsByLabel;
          if (creditByLabel && !pointsByLabel) out.discount_points = creditByLabel;
          
          // Fallback: global regex extraction if label-directed failed
          if (out.rate === 'N/A') {
            const ratePatterns = [
              /(\\d+\\.\\d{2,3})\\s*%/,
              /rate[^\\d]*(\\d+\\.\\d{2,3})/i,
              /(\\d+\\.\\d{2,3})/
            ];
            
            for (const pattern of ratePatterns) {
              const match = allText.match(pattern);
              if (match && match[1]) {
                out.rate = match[1];
                out.apr = match[1];
                break;
              }
            }
          }
          
          if (out.monthly_payment === 'N/A') {
            const paymentPatterns = [
              /\\$\\s*([\\d,]+\\.\\d{2})/,
              /payment[^\\d$]*\\$?\\s*([\\d,]+\\.\\d{2})/i
            ];
            
            for (const pattern of paymentPatterns) {
              const match = allText.match(pattern);
              if (match && match[1]) {
                out.monthly_payment = match[1].replace(/,/g, '');
                break;
              }
            }
          }
          
          if (out.discount_points === 'N/A') {
            const creditPatterns = [
              /([\\-]?\\d+\\.\\d{3})/,
              /credit[^\\d-]*([\\-]?\\d+\\.\\d{2,3})/i,
              /points[^\\d-]*([\\-]?\\d+\\.\\d{2,3})/i
            ];
            
            for (const pattern of creditPatterns) {
              const match = allText.match(pattern);
              if (match && match[1] && match[1] !== out.rate) {
                out.discount_points = match[1];
                break;
              }
            }
          }
          
          return out;
        }, extractByLabel.toString());
        
        console.log('Main document extraction:', JSON.stringify(results));
        
        // If main doc failed, try iframes
        if (results.rate === 'N/A' || results.monthly_payment === 'N/A') {
          console.log('Checking iframes for results...');
          const frames = page.frames();
          for (let i = 0; i < frames.length; i++) {
            try {
              const frameResults = await frames[i].evaluate(() => {
                const text = document.body?.innerText || '';
                const out = { rate: 'N/A', monthly_payment: 'N/A', discount_points: 'N/A', debug_text: text.substring(0, 800) };
                
                const r = text.match(/(\\d+\\.\\d{2,3})\\s*%/);
                const p = text.match(/\\$\\s*([\\d,]+\\.\\d{2})/);
                const d = text.match(/([\\-]?\\d+\\.\\d{3})/);
                
                if (r) out.rate = r[1];
                if (p) out.monthly_payment = p[1].replace(/,/g, '');
                if (d && d[1] !== out.rate) out.discount_points = d[1];
                
                return out;
              });
              
              if (frameResults.rate !== 'N/A' && frameResults.monthly_payment !== 'N/A') {
                console.log(\`Found results in iframe \${i}\`);
                results = { ...results, ...frameResults };
                break;
              }
            } catch (e) {
              // Frame access error, skip
            }
          }
        }
        
        // Final validation
        if (results.rate === 'N/A' || results.monthly_payment === 'N/A') {
          // Capture debug artifacts
          let screenshot = null;
          let htmlContent = null;
          
          try {
            console.log('Capturing debug artifacts...');
            screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
            htmlContent = await page.content();
            console.log('Debug artifacts captured successfully');
          } catch (e) {
            console.error('Failed to capture debug artifacts:', e.message);
          }
          
          throw new Error(JSON.stringify({
            message: 'Failed to extract valid pricing results',
            rate: results.rate,
            payment: results.monthly_payment,
            debug_text: results.debug_text,
            screenshot: screenshot ? screenshot.substring(0, 100) + '...' : null,
            html_length: htmlContent ? htmlContent.length : null
          }));
        }
        
        console.log('Final extracted results:', JSON.stringify(results));
        return results;
      };
    `;

    // Call Browserless /function endpoint with stealth and hardening
    const browserlessResponse = await fetch(
      `https://production-sfo.browserless.io/function?token=${browserlessKey}&stealth=true&blockAds=true&ignoreHTTPSErrors=true`,
      {
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
      }
    );

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

    // Parse error details if it's a JSON string
    let errorDetails = { message: error.message };
    try {
      errorDetails = JSON.parse(error.message);
    } catch (e) {
      // Not JSON, use as-is
    }

    // Try to upload debug artifacts if available
    let debugLinks = '';
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Check if we have debug artifacts in the error
      if (errorDetails.screenshot || errorDetails.html_length) {
        console.log('[loan-pricer-scraper] Attempting to upload debug artifacts...');
        
        // Note: Screenshot and HTML are captured in the browser script
        // They would need to be returned in the results and handled here
        // For now, we'll just log that they're available
        debugLinks = ' | Debug artifacts captured in browser context';
      }
      
      // Update pricing run with failed status
      await supabase
        .from('pricing_runs')
        .update({
          status: 'failed',
          error_message: errorDetails.message + debugLinks,
          completed_at: new Date().toISOString(),
          results_json: errorDetails
        })
        .eq('id', run_id);
        
    } catch (updateError) {
      console.error('[loan-pricer-scraper] Error updating failed status:', updateError);
    }

    return new Response(
      JSON.stringify({ success: false, error: errorDetails.message || error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
