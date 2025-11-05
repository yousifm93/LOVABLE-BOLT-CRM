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
        
        // Helper: try multiple label synonyms for the same field
        async function fillAnyOfLabels(labelSynonyms, value, fieldType = 'input') {
          for (const labelText of labelSynonyms) {
            const success = await fillFieldByLabel(labelText, value, fieldType);
            if (success) {
              console.log(\`Successfully filled using label: \${labelText}\`);
              return true;
            }
          }
          console.warn(\`Could not fill any of: \${labelSynonyms.join(', ')}\`);
          return false;
        }
        
        // Helper function to fill field by label with enhanced robustness
        async function fillFieldByLabel(labelText, value, fieldType = 'input') {
          console.log(\`Filling \${labelText} with \${value} (type: \${fieldType})\`);
          
          try {
            if (fieldType === 'dropdown') {
              // Wait for label
              await page.waitForXPath(\`//label[contains(text(), "\${labelText}")]\`, { timeout: 5000 });
              
              // Random delay to avoid bot detection
              await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
              
              // Try clicking dropdown button
              const buttonSelector = \`//label[contains(text(), "\${labelText}")]/following::div[@role="button"][1]\`;
              const buttons = await page.$x(buttonSelector);
              if (buttons[0]) {
                await buttons[0].scrollIntoView();
                await buttons[0].click();
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Normalize value for matching (extract key part)
                const valueSnippet = String(value).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                
                // Click option - use contains for flexible matching
                const optionSelector = \`//li[@role="option" and contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "\${valueSnippet.toLowerCase()}")]\`;
                await page.waitForXPath(optionSelector, { timeout: 3000 });
                const options = await page.$x(optionSelector);
                if (options[0]) {
                  await options[0].click();
                  await new Promise(resolve => setTimeout(resolve, 300));
                  return true;
                }
              }
            } else if (fieldType === 'input') {
              const inputSelector = \`//label[contains(text(), "\${labelText}")]/following::input[1]\`;
              await page.waitForXPath(inputSelector, { timeout: 5000 });
              const inputs = await page.$x(inputSelector);
              if (inputs[0]) {
                await inputs[0].scrollIntoView();
                await inputs[0].click({ clickCount: 3 });
                await new Promise(resolve => setTimeout(resolve, 100));
                await inputs[0].type(String(value), { delay: 50 });
                
                // Fire blur and Tab to trigger onChange
                await page.keyboard.press('Tab');
                await page.evaluate(el => { el.blur(); }, inputs[0]);
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Read back value to verify
                const filledValue = await page.evaluate(el => el.value, inputs[0]);
                console.log(\`Read back \${labelText}: \${filledValue}\`);
                return true;
              }
            } else if (fieldType === 'checkbox') {
              const checkboxSelector = \`//span[contains(text(), "\${labelText}")]/preceding::input[@type="checkbox"][1]\`;
              const checkboxes = await page.$x(checkboxSelector);
              if (checkboxes[0] && value === true) {
                const isChecked = await page.evaluate((el) => el.checked, checkboxes[0]);
                if (!isChecked) {
                  await checkboxes[0].click();
                  await new Promise(resolve => setTimeout(resolve, 200));
                }
                return true;
              }
            }
          } catch (error) {
            console.error(\`Error filling \${labelText}:\`, error.message);
            return false;
          }
          return false;
        }
        
        // Helper: click and type into number display next to sliders
        async function fillNumberDisplayByLabel(labelText, value) {
          console.log('Filling number display for ' + labelText + ' with ' + value);
          
          try {
            // Wait for the label to exist
            const labelXPath = '//label[contains(text(), "' + labelText + '")]';
            await page.waitForXPath(labelXPath, { timeout: 5000 });
            
            // Try multiple XPath patterns to find the number display element
            const displaySelectors = [
              // Look for spans/divs with common value/number classes after the label
              '//label[contains(text(), "' + labelText + '")]/following::span[contains(@class, "value") or contains(@class, "number") or contains(@class, "display")][1]',
              '//label[contains(text(), "' + labelText + '")]/following::div[contains(@class, "value") or contains(@class, "number") or contains(@class, "display")][1]',
              
              // Look for any element containing only digits (and possibly commas/decimals)
              '//label[contains(text(), "' + labelText + '")]/following::*[string-length(translate(text(), "0123456789,.", "")) = 0 and string-length(text()) > 0][1]',
              
              // Look in parent's sibling container
              '//label[contains(text(), "' + labelText + '")]/../following-sibling::*//span[string-length(translate(text(), "0123456789,.", "")) = 0][1]',
              
              // Look for any nearby contenteditable or editable element
              '//label[contains(text(), "' + labelText + '")]/following::*[@contenteditable="true"][1]'
            ];
            
            for (const selector of displaySelectors) {
              try {
                const elements = await page.$x(selector);
                if (elements.length > 0 && elements[0]) {
                  // Scroll into view
                  await elements[0].scrollIntoView();
                  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 100));
                  
                  // Triple-click to select all content
                  await elements[0].click({ clickCount: 3 });
                  await new Promise(resolve => setTimeout(resolve, 150));
                  
                  // Type the new value
                  await page.keyboard.type(String(value), { delay: 50 });
                  
                  // Press Tab to confirm and move focus
                  await page.keyboard.press('Tab');
                  await new Promise(resolve => setTimeout(resolve, 300));
                  
                  // Try to read back the value to confirm it was set
                  const newValue = await page.evaluate(el => {
                    return el.innerText || el.textContent || el.value || el.getAttribute('aria-valuenow');
                  }, elements[0]);
                  
                  console.log('✓ Read back ' + labelText + ': ' + newValue);
                  return true;
                }
              } catch (selectorError) {
                // Try next selector
                continue;
              }
            }
            
            console.warn('Could not find number display for ' + labelText);
            return false;
          } catch (error) {
            console.error('Error filling number display for ' + labelText + ':', error.message);
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
        
        // Navigate to pricer
        await page.goto('https://pricer.admortgage.com/', { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Dismiss any consent overlays
        await dismissConsent();
        
        // Fill form fields with enhanced logic
        await fillFieldByLabel('Program', scenarioData.program_type, 'dropdown');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await fillFieldByLabel('Citizenship', scenarioData.citizenship, 'dropdown');
        await fillFieldByLabel('Occupancy', scenarioData.occupancy, 'dropdown');
        await fillFieldByLabel('Purpose', scenarioData.loan_purpose, 'dropdown');
        
        if (scenarioData.program_type === 'Non-QM' && scenarioData.income_type) {
          await fillFieldByLabel('Income Type', scenarioData.income_type, 'dropdown');
        }
        
        // Try number display first (for slider), fallback to input field
        let ficoFilled = await fillNumberDisplayByLabel('FICO', scenarioData.fico_score);
        if (!ficoFilled) {
          console.log('Falling back to input field for FICO');
          ficoFilled = await fillFieldByLabel('FICO', scenarioData.fico_score.toString(), 'input');
        }
        
        // Try number display first (for slider), fallback to input field
        let ltvFilled = await fillNumberDisplayByLabel('LTV', scenarioData.ltv);
        if (!ltvFilled) {
          console.log('Falling back to input field for LTV');
          ltvFilled = await fillAnyOfLabels(['LTV', 'CLTV'], scenarioData.ltv.toString(), 'input');
        }
        
        // Try number display first (for slider), fallback to input field
        let loanAmountFilled = await fillNumberDisplayByLabel('Loan Amount', scenarioData.loan_amount);
        if (!loanAmountFilled) {
          console.log('Falling back to input field for Loan Amount');
          loanAmountFilled = await fillFieldByLabel('Loan Amount', scenarioData.loan_amount.toString(), 'input');
        }
        
        // NEW: Fill Lock Period (was missing before)
        const lockValue = scenarioData.lock_period + ' Days';
        await fillAnyOfLabels(['Lock Period', 'Rate Lock', 'Lock Term'], lockValue, 'dropdown');
        
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
        
        // NEW: Explicitly trigger pricing
        console.log('Triggering pricing calculation...');
        let priceButtonClicked = false;
        const priceButtonSelectors = [
          '//button[contains(., "Price")]',
          '//button[contains(., "Get Pricing")]',
          '//button[contains(., "Search")]',
          '//button[contains(., "Calculate")]',
          '//div[@role="button" and contains(., "Price")]'
        ];
        
        for (const sel of priceButtonSelectors) {
          try {
            const btns = await page.$x(sel);
            if (btns[0]) {
              await btns[0].scrollIntoView();
              await btns[0].click();
              console.log(\`Clicked pricing button: \${sel}\`);
              priceButtonClicked = true;
              await new Promise(resolve => setTimeout(resolve, 4000));
              break;
            }
          } catch (e) {
            // Try next
          }
        }
        
        if (!priceButtonClicked) {
          console.log('No explicit price button found, simulating Enter key');
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
        
        // Wait for results with content pattern checks
        console.log('Waiting for pricing results with content patterns...');
        let foundResults = false;
        
        try {
          // Wait for either percentage or currency patterns in the page
          await page.waitForFunction(() => {
            const text = document.body.innerText || '';
            return /\\d+\\.\\d{2,3}\\s*%/.test(text) || /\\$\\s*[\\d,]+\\.\\d{2}/.test(text);
          }, { timeout: 12000 });
          foundResults = true;
          console.log('Found content patterns matching results');
        } catch (e) {
          console.warn('Content pattern wait timed out, will try extraction anyway');
        }
        
        // Extra wait for results to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Extract results from main document
        console.log('Extracting pricing results from main document...');
        let results = await page.evaluate(() => {
          const responseBox = document.querySelector('div.quickPricerBody_response') ||
                              document.querySelector('[class*="quickPricer"][class*="response"]') ||
                              document.querySelector('[class*="response"]');
          
          let allText = '';
          if (responseBox) {
            allText = responseBox.innerText || responseBox.textContent || '';
          } else {
            // Fallback to body
            allText = document.body.innerText || '';
          }
          
          const out = {
            rate: 'N/A',
            monthly_payment: 'N/A',
            discount_points: 'N/A',
            apr: 'N/A',
            program_name: 'Quick Pricer Result',
            priced_at: new Date().toISOString(),
            debug_text: allText.substring(0, 800)
          };
          
          // Rate extraction
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
          
          // Payment extraction
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
          
          // Points/credit extraction
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
          
          return out;
        });
        
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
          // Take screenshot for debugging
          try {
            const screenshot = await page.screenshot({ encoding: 'base64', fullPage: true });
            console.log('Screenshot (base64 prefix):', screenshot.substring(0, 120) + '...');
          } catch (e) {
            console.error('Screenshot failed:', e.message);
          }
          
          throw new Error('Failed to extract valid pricing results. Rate: ' + results.rate + ', Payment: ' + results.monthly_payment + ', Debug text: ' + results.debug_text);
        }
        
        console.log('Final extracted results:', JSON.stringify(results));
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
