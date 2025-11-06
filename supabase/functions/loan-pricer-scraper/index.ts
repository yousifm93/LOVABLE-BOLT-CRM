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
        
        // Helper: set slider by label using ARIA
        async function setSliderByLabel(labelText, targetValue) {
          console.log(\`Setting slider \${labelText} to \${targetValue}\`);
          try {
            // Find label and its associated slider
            const labelElements = await page.$x(\`//label[contains(text(), "\${labelText}")]\`);
            if (!labelElements[0]) {
              console.warn(\`Label not found: \${labelText}\`);
              return false;
            }
            
            // Find nearest slider element by role
            const sliderSelector = \`//label[contains(text(), "\${labelText}")]/following::*[@role="slider"][1]\`;
            const sliders = await page.$x(sliderSelector);
            if (!sliders[0]) {
              console.warn(\`Slider not found for: \${labelText}\`);
              return false;
            }
            
            // Get current value and range
            const ariaValue = await page.evaluate(el => ({
              current: parseFloat(el.getAttribute('aria-valuenow')) || 0,
              min: parseFloat(el.getAttribute('aria-valuemin')) || 0,
              max: parseFloat(el.getAttribute('aria-valuemax')) || 100
            }), sliders[0]);
            
            console.log(\`Current slider state: \${JSON.stringify(ariaValue)}\`);
            
            // Calculate steps needed
            const target = parseFloat(targetValue);
            const diff = target - ariaValue.current;
            const steps = Math.abs(Math.round(diff));
            const direction = diff > 0 ? 'ArrowRight' : 'ArrowLeft';
            
            // Focus slider
            await sliders[0].scrollIntoView();
            await sliders[0].click();
            await new Promise(r => setTimeout(r, 200));
            
            // Send arrow keys to adjust slider (max 200 steps to prevent infinite loops)
            for (let i = 0; i < Math.min(steps, 200); i++) {
              await page.keyboard.press(direction);
              await new Promise(r => setTimeout(r, 20));
              
              // Check value every 10 steps
              if (i % 10 === 0) {
                const currentVal = await page.evaluate(el => parseFloat(el.getAttribute('aria-valuenow')), sliders[0]);
                if (Math.abs(currentVal - target) < 1) {
                  console.log(\`✓ Reached target value: \${currentVal}\`);
                  break;
                }
              }
            }
            
            // Commit with Tab
            await page.keyboard.press('Tab');
            await new Promise(r => setTimeout(r, 400));
            
            // Verify final value
            const finalValue = await page.evaluate(el => parseFloat(el.getAttribute('aria-valuenow')), sliders[0]);
            console.log(\`Final slider value: \${finalValue}\`);
            return true;
          } catch (e) {
            console.error(\`Error setting slider \${labelText}:\`, e.message);
            return false;
          }
        }
        
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
        
        // Helper function to fill field by label with enhanced robustness and synonym support
        async function fillFieldByLabel(labelText, value, fieldType = 'input', fieldName = null) {
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
                
                // Get synonyms if fieldName provided
                const valuesToTry = fieldName ? getSynonyms(fieldName, value) : [String(value)];
                console.log(\`Trying synonyms for \${labelText}: \${valuesToTry.join(', ')}\`);
                
                // Try each synonym
                for (const tryValue of valuesToTry) {
                  const valueSnippet = String(tryValue).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                  const optionSelector = \`//li[@role="option" and contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "\${valueSnippet.toLowerCase()}")]\`;
                  
                  try {
                    await page.waitForXPath(optionSelector, { timeout: 1500 });
                    const options = await page.$x(optionSelector);
                    if (options[0]) {
                      await options[0].click();
                      await new Promise(resolve => setTimeout(resolve, 300));
                      console.log(\`✓ Selected option using synonym: \${tryValue}\`);
                      return true;
                    }
                  } catch (e) {
                    // Try next synonym
                    continue;
                  }
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
            // Try multiple XPath patterns to find the number display element
            const displaySelectors = [
              // label-based selectors
              '//label[contains(text(), "' + labelText + '")]/following::span[contains(@class, "value") or contains(@class, "number") or contains(@class, "display")][1]',
              '//label[contains(text(), "' + labelText + '")]/following::div[contains(@class, "value") or contains(@class, "number") or contains(@class, "display")][1]',
              '//label[contains(text(), "' + labelText + '")]/following::*[string-length(translate(text(), "0123456789,.", "")) = 0 and string-length(text()) > 0][1]',
              '//label[contains(text(), "' + labelText + '")]/../following-sibling::*//span[string-length(translate(text(), "0123456789,.", "")) = 0][1]',
              '//label[contains(text(), "' + labelText + '")]/following::*[@contenteditable="true"][1]',
              // generic text-based selectors (if not a <label>)
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::span[contains(@class, "value") or contains(@class, "number") or contains(@class, "display")][1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::*[string-length(translate(text(), "0123456789,.", "")) = 0 and string-length(text()) > 0][1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::*[@contenteditable="true"][1]'
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
        
        // Helper: find and fill nearest numeric/text input by label
        async function fillNearestNumericInputByLabel(labelText, value) {
          try {
            const inputXPaths = [
              '//label[contains(text(), "' + labelText + '")]/following::input[@type="number"][1]',
              '//label[contains(text(), "' + labelText + '")]/following::input[@type="text"][1]',
              '//label[contains(text(), "' + labelText + '")]/following::*[@role="spinbutton"][1]',
              '//label[contains(text(), "' + labelText + '")]/following::*[contains(@class,"input") or contains(@class,"MuiInput") or contains(@class,"TextField")]//input[1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::input[@type="number"][1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::input[@type="text"][1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::*[@role="spinbutton"][1]',
              '//*[contains(normalize-space(.), "' + labelText + '")]/following::*[contains(@class,"input") or contains(@class,"MuiInput") or contains(@class,"TextField")]//input[1]'
            ];
            for (const xp of inputXPaths) {
              const els = await page.$x(xp);
              if (els.length > 0) {
                await els[0].scrollIntoView();
                await els[0].click({ clickCount: 3 });
                await new Promise(r => setTimeout(r, 100));
                await page.evaluate((el, v) => {
                  const setVal = (node, val) => {
                    const proto = Object.getPrototypeOf(node);
                    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
                    if (desc && typeof desc.set === 'function') {
                      desc.set.call(node, String(val));
                    } else {
                      node.value = String(val);
                    }
                    node.dispatchEvent(new Event('input', { bubbles: true }));
                    node.dispatchEvent(new Event('change', { bubbles: true }));
                  };
                  setVal(el, v);
                }, els[0], String(value));
                await page.keyboard.press('Tab');
                await new Promise(r => setTimeout(r, 200));
                const filledValue = await page.evaluate(el => el.value, els[0]);
                console.log('✓ Read back input for ' + labelText + ': ' + filledValue);
                return true;
              }
            }
            console.warn('No numeric/text input found for ' + labelText);
            return false;
          } catch (e) {
            console.error('Error in fillNearestNumericInputByLabel for ' + labelText + ':', e.message);
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
        
        // Try slider with ARIA first, then fallbacks
        let ficoFilled = await setSliderByLabel('FICO', scenarioData.fico_score);
        if (!ficoFilled) {
          ficoFilled = await fillNumberDisplayByLabel('FICO', scenarioData.fico_score);
        }
        if (!ficoFilled) {
          console.log('Falling back to input field for FICO');
          ficoFilled = await fillFieldByLabel('FICO', scenarioData.fico_score.toString(), 'input');
        }
        if (!ficoFilled) {
          console.log('Falling back to nearest numeric input for FICO');
          ficoFilled = await fillNearestNumericInputByLabel('FICO', scenarioData.fico_score);
        }
        
        // LTV/CLTV with slider + fallbacks
        let ltvFilled = await setSliderByLabel('LTV', scenarioData.ltv);
        if (!ltvFilled) {
          ltvFilled = await setSliderByLabel('CLTV', scenarioData.ltv);
        }
        if (!ltvFilled) {
          ltvFilled = await fillNumberDisplayByLabel('LTV', scenarioData.ltv);
        }
        if (!ltvFilled) {
          ltvFilled = await fillNumberDisplayByLabel('CLTV', scenarioData.ltv);
        }
        if (!ltvFilled) {
          console.log('Falling back to input field for LTV/CLTV');
          ltvFilled = await fillAnyOfLabels(['LTV', 'CLTV'], scenarioData.ltv.toString(), 'input');
        }
        if (!ltvFilled) {
          console.log('Falling back to nearest numeric input for LTV/CLTV');
          ltvFilled = await fillNearestNumericInputByLabel('LTV', scenarioData.ltv) || await fillNearestNumericInputByLabel('CLTV', scenarioData.ltv);
        }
        
        // Loan Amount with slider + fallbacks
        let loanAmountFilled = await setSliderByLabel('Loan Amount', scenarioData.loan_amount);
        if (!loanAmountFilled) {
          loanAmountFilled = await fillNumberDisplayByLabel('Loan Amount', scenarioData.loan_amount);
        }
        if (!loanAmountFilled) {
          console.log('Falling back to input field for Loan Amount');
          loanAmountFilled = await fillFieldByLabel('Loan Amount', scenarioData.loan_amount.toString(), 'input');
        }
        if (!loanAmountFilled) {
          console.log('Falling back to nearest numeric input for Loan Amount');
          loanAmountFilled = await fillNearestNumericInputByLabel('Loan Amount', scenarioData.loan_amount);
        }
        
        // Small pause to let UI react to numeric inputs
        await new Promise(resolve => setTimeout(resolve, 600));
        
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
              
              // Wait for network to idle after clicking
              await new Promise(resolve => setTimeout(resolve, 1000));
              try {
                await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 });
              } catch (e) {
                console.log('Network idle timeout, continuing...');
              }
              await new Promise(resolve => setTimeout(resolve, 3000));
              break;
            }
          } catch (e) {
            // Try next
          }
        }
        
        if (!priceButtonClicked) {
          console.log('No explicit price button found, simulating Enter key');
          await page.keyboard.press('Enter');
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            await page.waitForNetworkIdle({ idleTime: 500, timeout: 3000 });
          } catch (e) {
            console.log('Network idle timeout after Enter, continuing...');
          }
          await new Promise(resolve => setTimeout(resolve, 3000));
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
