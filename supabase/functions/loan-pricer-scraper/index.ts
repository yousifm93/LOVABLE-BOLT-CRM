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
  
  // Debug
  debug_mode?: boolean;
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
    const debugMode = pricingRun.debug_mode || scenarioData.debug_mode || false;
    console.log('[loan-pricer-scraper] Scenario:', scenarioData);
    if (debugMode) {
      console.log('[DEBUG MODE] Enabled - will capture screenshots and logs');
    }

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
        const debugMode = context.debugMode;
        let debugLogs = [];
        
        function log(message) {
          const msg = '[' + new Date().toISOString() + '] ' + message;
          console.log(msg);
          if (debugMode) debugLogs.push(msg);
        }
        
        // ========== STEP 1: DOM SURVEY ==========
        let domSurvey = { frames: [] };
        
        async function conductDOMSurvey() {
          console.log('=== Starting DOM Survey ===');
          const allFrames = [page, ...page.frames()];
          
          const ANCHOR_SYNONYMS = {
            'FICO': ['FICO', 'Credit Score', 'FICO Score'],
            'CLTV': ['CLTV', 'LTV', 'LTV %', 'Loan to Value', 'LTV/CLTV'],
            'Loan Amount': ['Loan Amount', 'Base Loan Amount', 'Loan Amt']
          };
          
          for (let frameIdx = 0; frameIdx < allFrames.length; frameIdx++) {
            const frame = allFrames[frameIdx];
            const frameName = frameIdx === 0 ? 'main' : \`iframe-\${frameIdx}\`;
            
            try {
              const frameSurvey = await frame.evaluate((anchors) => {
                const survey = {
                  name: '',
                  textSample: '',
                  anchors: {},
                  allInputs: []
                };
                
                // Text sample
                survey.textSample = (document.body?.innerText || '').substring(0, 800);
                
                // Find anchors
                for (const [anchorKey, synonyms] of Object.entries(anchors)) {
                  const found = { candidates: [] };
                  
                  for (const syn of synonyms) {
                    const labels = Array.from(document.querySelectorAll('label, div, span'));
                    const anchor = labels.find(el => {
                      const txt = el.textContent || '';
                      return txt.includes(syn) && txt.length < 100;
                    });
                    
                    if (anchor) {
                      const container = anchor.closest('div') || anchor.parentElement;
                      if (container) {
                        // Find all editable controls nearby
                        const controls = container.querySelectorAll(
                          'input[type="number"], input[type="text"], [inputmode="numeric"], [contenteditable="true"], [role="spinbutton"]'
                        );
                        
                        controls.forEach((ctrl, idx) => {
                          try {
                            const rect = ctrl.getBoundingClientRect();
                            found.candidates.push({
                              idx,
                              tagName: ctrl.tagName,
                              type: ctrl.getAttribute('type'),
                              inputmode: ctrl.getAttribute('inputmode'),
                              role: ctrl.getAttribute('role'),
                              ariaLabel: ctrl.getAttribute('aria-label'),
                              placeholder: ctrl.getAttribute('placeholder'),
                              value: ctrl.value || ctrl.textContent || '',
                              outerHTML: ctrl.outerHTML?.substring(0, 200),
                              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
                            });
                          } catch (e) {}
                        });
                      }
                      
                      if (found.candidates.length > 0) break;
                    }
                  }
                  
                  survey.anchors[anchorKey] = found;
                }
                
                // General input inventory
                const allInputs = document.querySelectorAll('input, select, [contenteditable="true"]');
                allInputs.forEach((inp, idx) => {
                  if (idx < 50) {
                    try {
                      survey.allInputs.push({
                        idx,
                        tagName: inp.tagName,
                        type: inp.getAttribute('type'),
                        name: inp.getAttribute('name'),
                        id: inp.id,
                        ariaLabel: inp.getAttribute('aria-label'),
                        value: (inp.value || inp.textContent || '').substring(0, 50)
                      });
                    } catch (e) {}
                  }
                });
                
                return survey;
              }, ANCHOR_SYNONYMS);
              
              frameSurvey.name = frameName;
              domSurvey.frames.push(frameSurvey);
              console.log(\`Survey frame \${frameName}: \${frameSurvey.anchors.FICO?.candidates.length || 0} FICO, \${frameSurvey.anchors.LTV?.candidates.length || 0} LTV, \${frameSurvey.anchors['Loan Amount']?.candidates.length || 0} Loan Amount candidates\`);
            } catch (e) {
              console.error(\`Survey frame \${frameName} failed:\`, e.message);
            }
          }
          
          console.log('=== DOM Survey Complete ===');
          console.log('Full survey:', JSON.stringify(domSurvey, null, 2));
        }
        
        // ========== STEP 2: FRAME-AWARE FILLERS ==========
        const NUMERIC_LABEL_SYNONYMS = {
          'FICO': ['FICO', 'Credit Score', 'FICO Score'],
          'CLTV': ['CLTV', 'LTV', 'LTV %', 'Loan to Value'],
          'Loan Amount': ['Loan Amount', 'Base Loan Amount', 'Loan Amt']
        };
        
        // Material-UI Slider Filler
        async function fillSliderFrameAware(labelText, value) {
          console.log(\`Filling slider \${labelText} with \${value}\`);
          const allFrames = [page, ...page.frames()];
          const labelSynonyms = NUMERIC_LABEL_SYNONYMS[labelText] || [labelText];
          
          for (let frameIdx = 0; frameIdx < allFrames.length; frameIdx++) {
            const frame = allFrames[frameIdx];
            const frameName = frameIdx === 0 ? 'main' : \`iframe-\${frameIdx}\`;
            
            for (const synonym of labelSynonyms) {
              try {
                // Look for Material-UI slider by label
                const result = await frame.evaluate((lbl, val) => {
                  // Find label
                  const labels = Array.from(document.querySelectorAll('label'));
                  const label = labels.find(l => l.textContent?.includes(lbl));
                  if (!label) return null;
                  
                  // Find slider container
                  const container = label.closest('div');
                  if (!container) return null;
                  
                  // Find slider input or thumb
                  const slider = container.querySelector('.MuiSlider-root, [role="slider"]');
                  const input = container.querySelector('input[type="number"], input[type="text"], input[type="hidden"]');
                  
                  if (input) {
                    // Try to set value directly
                    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
                    nativeInputValueSetter.call(input, val);
                    
                    // Trigger change events
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    
                    return { success: true, method: 'input', value: input.value };
                  }
                  
                  if (slider) {
                    // Set aria-valuenow for sliders
                    slider.setAttribute('aria-valuenow', val);
                    slider.dispatchEvent(new Event('change', { bubbles: true }));
                    return { success: true, method: 'slider', value: val };
                  }
                  
                  return null;
                }, synonym, value);
                
                if (result?.success) {
                  console.log(\`✓ \${labelText} slider set to \${value} in \${frameName} via \${result.method}\`);
                  await new Promise(r => setTimeout(r, 300));
                  return true;
                }
              } catch (e) {
                console.error(\`Slider fill error in \${frameName} for \${synonym}:\`, e.message);
              }
            }
          }
          
          console.warn(\`Failed to fill slider \${labelText}\`);
          return false;
        }
        
        async function fillNumberInputFrameAware(labelText, value) {
          // Try slider first for FICO, CLTV, Loan Amount (Material-UI sliders)
          if (['FICO', 'CLTV', 'Loan Amount'].includes(labelText)) {
            const sliderSuccess = await fillSliderFrameAware(labelText, value);
            if (sliderSuccess) return true;
            console.log(\`Slider fill failed for \${labelText}, trying input fallback...\`);
          }
          
          console.log(\`Filling \${labelText} with \${value} (frame-aware input)\`);
          const allFrames = [page, ...page.frames()];
          const labelSynonyms = NUMERIC_LABEL_SYNONYMS[labelText] || [labelText];
          
          for (let frameIdx = 0; frameIdx < allFrames.length; frameIdx++) {
            const frame = allFrames[frameIdx];
            const frameName = frameIdx === 0 ? 'main' : \`iframe-\${frameIdx}\`;
            
            for (const synonym of labelSynonyms) {
              try {
                // Enhanced selectors for different input types
                const selectors = [
                  \`//label[contains(text(), "\${synonym}")]/..//input[@type="number"]\`,
                  \`//label[contains(text(), "\${synonym}")]/..//input[@type="text"]\`,
                  \`//label[contains(text(), "\${synonym}")]/..//input[@inputmode="numeric"]\`,
                  \`//label[contains(text(), "\${synonym}")]/..//div[@contenteditable="true"]\`,
                  \`//label[contains(text(), "\${synonym}")]/following-sibling::*[1]//input\`,
                  \`//input[contains(@aria-label, "\${synonym}")]\`,
                  // Special for LTV near %
                  labelText === 'LTV' ? \`//label[contains(text(), "%")]/..//input\` : null
                ].filter(Boolean);
                
                for (const selector of selectors) {
                  try {
                    const elements = await frame.$x(selector);
                    if (elements.length > 0) {
                      const input = elements[0];
                      
                      // Get old value
                      const oldValue = await frame.evaluate(el => el.value || el.textContent || '', input);
                      console.log(\`\${frameName}: Found \${labelText} via "\${synonym}", current: "\${oldValue}"\`);
                      
                      // Fill it
                      await input.scrollIntoView();
                      await new Promise(r => setTimeout(r, 150));
                      await input.click({ clickCount: 3 });
                      await new Promise(r => setTimeout(r, 120));
                      await frame.keyboard.type(String(value), { delay: 60 });
                      await new Promise(r => setTimeout(r, 200));
                      await frame.keyboard.press('Tab');
                      await new Promise(r => setTimeout(r, 400));
                      
                      // Verify
                      const verification = await frame.evaluate((el, lbl, val) => {
                        const inputValue = (el.value || el.textContent || '').trim();
                        
                        // Also check visible display
                        const labels = Array.from(document.querySelectorAll('label'));
                        const label = labels.find(l => l.textContent?.includes(lbl));
                        let displayValue = inputValue;
                        
                        if (label) {
                          const container = label.parentElement;
                          const visibleText = container?.textContent || '';
                          const match = visibleText.match(/(\d+(?:\.\d+)?)/);
                          if (match) displayValue = match[1];
                        }
                        
                        return {
                          inputValue,
                          displayValue,
                          matches: inputValue === String(val) || displayValue === String(val)
                        };
                      }, input, synonym, value);
                      
                      console.log(\`\${frameName}: \${labelText} verification - input="\${verification.inputValue}", display="\${verification.displayValue}", expected="\${value}", matches=\${verification.matches}\`);
                      
                      if (verification.matches) {
                        console.log(\`✓ \${labelText} set successfully in \${frameName}\`);
                        return true;
                      } else {
                        console.warn(\`Mismatch for \${labelText} in \${frameName}, trying next...\`);
                      }
                    }
                  } catch (e) {
                    // Try next selector
                  }
                }
              } catch (e) {
                console.error(\`Error in \${frameName} for \${synonym}:\`, e.message);
              }
            }
          }
          
          console.error(\`Failed to fill \${labelText} in any frame\`);
          return false;
        }
        
        // Frame-aware dropdown filler
        async function fillDropdownFrameAware(labelSynonyms, valueSynonyms, fieldType = 'dropdown') {
          const allFrames = [page, ...page.frames()];
          
          for (let frameIdx = 0; frameIdx < allFrames.length; frameIdx++) {
            const frame = allFrames[frameIdx];
            const frameName = frameIdx === 0 ? 'main' : \`iframe-\${frameIdx}\`;
            
            for (const labelText of labelSynonyms) {
              try {
                // Wait for label
                const labelSelector = \`//label[contains(text(), "\${labelText}")]\`;
                const labels = await frame.$x(labelSelector);
                if (labels.length === 0) continue;
                
                await new Promise(r => setTimeout(r, 150 + Math.random() * 200));
                
                // Find and click button/combobox
                const buttonSelector = \`//label[contains(text(), "\${labelText}")]/following::div[@role="button"][1]\`;
                const buttons = await frame.$x(buttonSelector);
                if (buttons.length > 0) {
                  await buttons[0].scrollIntoView();
                  await buttons[0].click();
                  await new Promise(r => setTimeout(r, 500));
                  
                  // Try each value synonym
                  for (const tryValue of valueSynonyms) {
                    const valueSnippet = String(tryValue).replace(/[^a-zA-Z0-9]/g, '').substring(0, 15);
                    const optionSelector = \`//li[@role="option" and contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "\${valueSnippet.toLowerCase()}")]\`;
                    
                    try {
                      await frame.waitForXPath(optionSelector, { timeout: 1500 });
                      const options = await frame.$x(optionSelector);
                      if (options.length > 0) {
                        await options[0].click();
                        await new Promise(r => setTimeout(r, 300));
                        
                        // Verify visible text
                        const visibleText = await frame.evaluate(el => el.textContent || '', buttons[0]);
                        const matched = visibleText.toLowerCase().includes(String(tryValue).toLowerCase().substring(0, 10));
                        
                        console.log(\`\${frameName}: \${labelText} set to "\${tryValue}", visible="\${visibleText}", matched=\${matched}\`);
                        if (matched) return true;
                      }
                    } catch (e) {
                      // Try next synonym
                    }
                  }
                }
              } catch (e) {
                console.error(\`Error filling \${labelText} in \${frameName}:\`, e.message);
              }
            }
          }
          
          console.error(\`Failed to fill dropdown \${labelSynonyms[0]} in any frame\`);
          return false;
        }
        
        // Normalization maps for field values - UPDATED TO MATCH WEBSITE EXACTLY
        const FIELD_SYNONYMS = {
          citizenship: {
            'US Citizen / Permanent Resident': ['US Citizen / Permanent Resident', 'US Citizen', 'Permanent Resident'],
            'Non-Permanent Resident': ['Non-Permanent Resident', 'Non Permanent Resident'],
            'Foreign national': ['Foreign national', 'Foreign National'],
            'ITIN': ['ITIN']
          },
          income_type: {
            '2Y Full Doc': ['2Y Full Doc', '2 Year Full Doc'],
            '1Y Full Doc': ['1Y Full Doc', '1 Year Full Doc'],
            '24 Months Bank Statement': ['24 Months Bank Statement', '24 Month Bank Statement'],
            '12 Months Bank Statement': ['12 Months Bank Statement', '12 Month Bank Statement'],
            '2Y P&L Only': ['2Y P&L Only', '2 Year P&L Only'],
            '1Y P&L Only': ['1Y P&L Only', '1 Year P&L Only'],
            'Asset Utilization': ['Asset Utilization'],
            'WVOE': ['WVOE'],
            '1099': ['1099'],
            'DSCR ≥ 1.25': ['DSCR ≥ 1.25', 'DSCR >= 1.25', 'DSCR']
          },
          amortization_type: {
            '30 Year Fixed': ['30 Year Fixed', '30 Yr Fixed', '30-Year Fixed'],
            '40 Year Fixed': ['40 Year Fixed', '40 Yr Fixed', '40-Year Fixed'],
            '5/6 ARM SOFR': ['5/6 ARM SOFR', '5/6 ARM'],
            '7/6 ARM SOFR': ['7/6 ARM SOFR', '7/6 ARM']
          },
          property_type: {
            '1 Unit SFR': ['1 Unit SFR', 'SFR', 'Single Family'],
            'SFR Rural': ['SFR Rural', 'Rural SFR'],
            'PUD': ['PUD'],
            'Condo': ['Condo', 'Condominium'],
            '2-4 Units': ['2-4 Units', '2-4 Unit', 'Multi-Unit'],
            'Condotel': ['Condotel'],
            'Manufactured housing': ['Manufactured housing', 'Manufactured'],
            'Multifamily property': ['Multifamily property', 'Multifamily'],
            'Mixed use': ['Mixed use', 'Mixed Use']
          },
          number_of_units: {
            '1 Unit': ['1 Unit', '1'],
            '2 Units': ['2 Units', '2'],
            '3 Units': ['3 Units', '3'],
            '4 Units': ['4 Units', '4'],
            '5 Units': ['5 Units', '5'],
            '6 Units': ['6 Units', '6'],
            '7 Units': ['7 Units', '7'],
            '8 Units': ['8 Units', '8']
          },
          broker_compensation: {
            'BPC': ['BPC', 'Broker Paid Compensation'],
            'LPC 0.25%': ['LPC 0.25%', 'LPC 0.25'],
            'LPC 0.5%': ['LPC 0.5%', 'LPC 0.5'],
            'LPC 0.75%': ['LPC 0.75%', 'LPC 0.75'],
            'LPC 1%': ['LPC 1%', 'LPC 1'],
            'LPC 1.25%': ['LPC 1.25%', 'LPC 1.25'],
            'LPC 1.5%': ['LPC 1.5%', 'LPC 1.5'],
            'LPC 1.75%': ['LPC 1.75%', 'LPC 1.75'],
            'LPC 2%': ['LPC 2%', 'LPC 2'],
            'LPC 2.25%': ['LPC 2.25%', 'LPC 2.25']
          },
          mortgage_history: {
            '0x30x12': ['0x30x12'],
            '0x60x12': ['0x60x12']
          },
          credit_event: {
            '48+ months': ['48+ months', '48 months+', '48+'],
            '< 48 months': ['< 48 months', 'less than 48 months']
          },
          dti: {
            'DTI 00.00% – 30.00%': ['DTI 00.00% – 30.00%', 'DTI 0-30%', 'DTI <=30%'],
            'DTI 30.01% – 40.00%': ['DTI 30.01% – 40.00%', 'DTI 30-40%'],
            'DTI 40.01% – 43.00%': ['DTI 40.01% – 43.00%', 'DTI 40-43%'],
            'DTI 43.01% – 45.00%': ['DTI 43.01% – 45.00%', 'DTI 43-45%'],
            'DTI 45.01% – 50.00%': ['DTI 45.01% – 50.00%', 'DTI 45-50%'],
            'DTI 50.01% – 55.00%': ['DTI 50.01% – 55.00%', 'DTI 50-55%'],
            'Not required': ['Not required', 'N/A', 'None']
          },
          prepayment_penalty: {
            'No PPP': ['No PPP', 'None'],
            '6m PPP': ['6m PPP', '6 month PPP'],
            '1Y PPP': ['1Y PPP', '1 Year PPP'],
            '2Y PPP': ['2Y PPP', '2 Year PPP'],
            '3Y PPP': ['3Y PPP', '3 Year PPP'],
            '4Y PPP': ['4Y PPP', '4 Year PPP'],
            '5Y PPP': ['5Y PPP', '5 Year PPP']
          },
          occupancy: {
            'Primary Residence': ['Primary Residence', 'Primary', 'Owner Occupied'],
            '2nd Home': ['2nd Home', 'Second Home', 'Vacation Home'],
            'Investment': ['Investment', 'Investment Property', 'Non Owner Occupied']
          },
          purpose: {
            'Purchase': ['Purchase', 'Buy'],
            'Rate/Term Refinance': ['Rate/Term Refinance', 'Rate Term', 'Refinance'],
            'Cashout': ['Cashout', 'Cash Out', 'Cash-Out Refinance']
          }
        };
        
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
        
        // Legacy single-frame filler for checkboxes
        async function fillFieldByLabel(labelText, value, fieldType = 'input') {
          try {
            if (fieldType === 'checkbox') {
              const checkboxSelector = \`//span[contains(text(), "\${labelText}")]/preceding::input[@type="checkbox"][1]\`;
              const checkboxes = await page.$x(checkboxSelector);
              if (checkboxes[0] && value === true) {
                const isChecked = await page.evaluate((el) => el.checked, checkboxes[0]);
                if (!isChecked) {
                  await checkboxes[0].click();
                  await new Promise(r => setTimeout(r, 200));
                }
                return true;
              }
            }
          } catch (e) {
            console.error('Error filling checkbox ' + labelText + ':', e.message);
          }
          return false;
        }
        
        // Dismiss consent overlays
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
                await new Promise(r => setTimeout(r, 500));
                return;
              }
            }
          } catch (e) {}
        }
        
        // ========== MAIN FLOW ==========
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
        
        await page.goto('https://pricer.admortgage.com/', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 3000));
        
        await dismissConsent();
        
        // Conduct survey
        await conductDOMSurvey();
        
        // Fill dropdowns first
        console.log('Filling dropdown fields...');
        
        // Use updated field synonyms
        await fillDropdownFrameAware(['Citizenship'], getSynonyms('citizenship', scenarioData.citizenship));
        await new Promise(r => setTimeout(r, 300));
        
        if (scenarioData.program_type === 'Non-QM' && scenarioData.income_type) {
          await fillDropdownFrameAware(['Income Type'], getSynonyms('income_type', scenarioData.income_type));
          await new Promise(r => setTimeout(r, 300));
        }
        
        await fillDropdownFrameAware(['Occupancy'], getSynonyms('occupancy', scenarioData.occupancy));
        await new Promise(r => setTimeout(r, 300));
        
        await fillDropdownFrameAware(['Purpose'], getSynonyms('purpose', scenarioData.loan_purpose));
        await new Promise(r => setTimeout(r, 300));
        
        // Fill numeric inputs with frame-aware logic (sliders for Material-UI)
        console.log('Filling numeric inputs (FICO, CLTV, Loan Amount)...');
        await fillNumberInputFrameAware('FICO', scenarioData.fico_score);
        await fillNumberInputFrameAware('CLTV', scenarioData.ltv);
        await fillNumberInputFrameAware('Loan Amount', scenarioData.loan_amount);
        
        await new Promise(r => setTimeout(r, 800));
        
        // Lock Period
        const lockValue = scenarioData.lock_period + ' Days';
        await fillDropdownFrameAware(['Lock Period', 'Rate Lock', 'Lock Term'], [lockValue]);
        
        // More dropdowns with updated synonyms
        await fillDropdownFrameAware(['Amortization Type'], getSynonyms('amortization_type', scenarioData.amortization_type));
        await new Promise(r => setTimeout(r, 300));
        
        await fillDropdownFrameAware(['Property Type'], getSynonyms('property_type', scenarioData.property_type));
        await new Promise(r => setTimeout(r, 300));
        
        if (scenarioData.num_units && scenarioData.num_units > 1) {
          await fillDropdownFrameAware(['Number of Units'], getSynonyms('number_of_units', scenarioData.num_units + ' Units'));
          await new Promise(r => setTimeout(r, 300));
        }
        
        await fillDropdownFrameAware(['State'], [scenarioData.state]);
        await new Promise(r => setTimeout(r, 300));
        
        // DTI with updated exact format
        const dtiValue = getSynonyms('dti', scenarioData.dti);
        await fillDropdownFrameAware(['DTI', 'Debt to Income', 'DTI Ratio'], dtiValue);
        await new Promise(r => setTimeout(r, 300));
        
        if (scenarioData.program_type === 'Non-QM') {
          if (scenarioData.mortgage_history) {
            await fillDropdownFrameAware(['Mortgage History'], getSynonyms('mortgage_history', scenarioData.mortgage_history));
            await new Promise(r => setTimeout(r, 300));
          }
          if (scenarioData.credit_events) {
            await fillDropdownFrameAware(['Credit Event'], getSynonyms('credit_event', scenarioData.credit_events));
            await new Promise(r => setTimeout(r, 300));
          }
        }
        
        await fillDropdownFrameAware(
          ['Broker Compensation'],
          getSynonyms('broker_compensation', scenarioData.broker_compensation)
        );
        
        // Checkboxes
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
        
        // ========== STEP 4: CLICK VIEW RATES & HANDLE PASSWORD ==========
        console.log('Clicking View Rates button...');
        await new Promise(r => setTimeout(r, 1000));
        
        // Wait a bit more for form to be ready
        await new Promise(r => setTimeout(r, 1000));
        
        // Find and click "View Rates" button
        console.log('Looking for View Rates button...');
        
        let viewRatesClicked = false;
        
        // Try XPath selectors first
        const xpathSelectors = [
          '//button[contains(text(), "View Rates")]',
          '//button[contains(translate(text(), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "view rates")]',
          '//*[@role="button" and contains(text(), "View Rates")]',
          '//input[@type="submit" and contains(@value, "View Rates")]',
          '//a[contains(text(), "View Rates")]'
        ];
        
        for (const xpath of xpathSelectors) {
          try {
            console.log('Trying XPath: ' + xpath);
            const elements = await page.$x(xpath);
            if (elements.length > 0) {
              console.log('Found ' + elements.length + ' elements with XPath');
              const element = elements[0];
              
              // Scroll into view using page.evaluate
              await page.evaluate((el) => {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, element);
              
              await new Promise(r => setTimeout(r, 500));
              await element.click();
              console.log('✓ View Rates button clicked via XPath');
              viewRatesClicked = true;
              break;
            }
          } catch (e) {
            console.log('XPath failed: ' + xpath + ' - ' + e.message);
          }
        }
        
        // If XPath failed, try CSS selectors
        if (!viewRatesClicked) {
          const cssSelectors = [
            'button[type="submit"]',
            'input[type="submit"]',
            'button.submit',
            'button.btn-primary',
            '[type="submit"]'
          ];
          
          for (const selector of cssSelectors) {
            try {
              console.log('Trying CSS: ' + selector);
              const element = await page.$(selector);
              if (element) {
                const text = await page.evaluate(el => el.textContent || el.value || '', element);
                console.log('Found button with text: "' + text + '"');
                
                if (text.toLowerCase().includes('view') || text.toLowerCase().includes('rate')) {
                  await page.evaluate((el) => {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, element);
                  
                  await new Promise(r => setTimeout(r, 500));
                  await element.click();
                  console.log('✓ View Rates button clicked via CSS');
                  viewRatesClicked = true;
                  break;
                }
              }
            } catch (e) {
              console.log('CSS failed: ' + selector + ' - ' + e.message);
            }
          }
        }
        
        // Last resort: try to click via JavaScript
        if (!viewRatesClicked) {
          console.log('Trying JavaScript click as last resort...');
          try {
            const clicked = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
              for (const btn of buttons) {
                const text = (btn.textContent || btn.value || '').toLowerCase();
                if (text.includes('view') && text.includes('rate')) {
                  btn.click();
                  return true;
                }
              }
              return false;
            });
            
            if (clicked) {
              console.log('✓ View Rates button clicked via JavaScript');
              viewRatesClicked = true;
            }
          } catch (e) {
            console.log('JavaScript click failed: ' + e.message);
          }
        }
        
        if (!viewRatesClicked) {
          // Capture page content for debugging
          const pageContent = await page.content();
          console.error('Page HTML:', pageContent.substring(0, 2000));
          throw new Error('Could not find or click View Rates button');
        }
        
        await new Promise(r => setTimeout(r, 1500));
        
        // Wait for and handle password modal
        console.log('Waiting for password modal...');
        try {
          await page.waitForSelector('input[type="password"]', { timeout: 5000 });
          console.log('✓ Password modal detected');
          await new Promise(r => setTimeout(r, 500));
          
          // Enter password
          console.log('Entering password...');
          const passwordInput = await page.$('input[type="password"]');
          if (!passwordInput) {
            throw new Error('Password input not found');
          }
          
          await passwordInput.click();
          await new Promise(r => setTimeout(r, 200));
          await passwordInput.type('admrates', { delay: 80 });
          await new Promise(r => setTimeout(r, 400));
          console.log('✓ Password entered');
          
          // Submit password - try multiple button selectors
          console.log('Submitting password...');
          const submitSelectors = [
            'button[type="submit"]',
            '//button[contains(text(), "Submit")]',
            '//button[contains(text(), "OK")]',
            '//button[contains(text(), "Enter")]',
            '//button[contains(., "Submit")]'
          ];
          
          let submitted = false;
          for (const selector of submitSelectors) {
            try {
              if (selector.startsWith('//')) {
                const buttons = await page.$x(selector);
                if (buttons.length > 0) {
                  await buttons[0].click();
                  submitted = true;
                  break;
                }
              } else {
                const button = await page.$(selector);
                if (button) {
                  await button.click();
                  submitted = true;
                  break;
                }
              }
            } catch (e) {}
          }
          
          if (!submitted) {
            // Try pressing Enter as fallback
            console.log('No submit button found, trying Enter key...');
            await page.keyboard.press('Enter');
          }
          
          console.log('✓ Password submitted');
          await new Promise(r => setTimeout(r, 2500));
          
        } catch (e) {
          console.error('Password modal handling failed:', e.message);
          throw new Error(\`Failed to handle password modal: \${e.message}\`);
        }
        
        // ========== STEP 5: WAIT FOR RESULTS ==========
        console.log('Waiting for results to populate...');
        const allFrames = [page, ...page.frames()];
        
        // Wait for results box with clear labels to appear
        console.log('Waiting for results box with Rate, Lender Credit, Monthly Payment...');
        try {
          await page.waitForFunction(() => {
            const text = document.body?.innerText || '';
            const hasRateLabel = text.includes('Rate, %') || text.includes('Rate,%');
            const hasLenderCredit = text.includes('Lender Credit');
            const hasMonthlyPayment = text.includes('Monthly Payment');
            console.log('Results labels check: Rate=' + hasRateLabel + ', Credit=' + hasLenderCredit + ', Payment=' + hasMonthlyPayment);
            return hasRateLabel && hasLenderCredit && hasMonthlyPayment;
          }, { timeout: 8000 });
          console.log('✓ Results section detected with clear labels');
        } catch (e) {
          console.warn('Clear labels wait timed out, proceeding with extraction...');
          await new Promise(r => setTimeout(r, 2000));
        }
        
        
        // ========== STEP 6: EXTRACT FROM MATERIAL-UI RESULTS PANEL ==========
        console.log('Extracting from Material-UI results panel...');
        
        // NEW: Enhanced extraction for Material-UI layout
        const extractResults = await page.evaluate(() => {
          console.log('=== Starting Material-UI Results Extraction ===');
          
          // Strategy 1: Find the loan program panel (e.g., "Super Prime 30 Year Fixed")
          const findProgramPanel = () => {
            const allDivs = Array.from(document.querySelectorAll('div, section, article'));
            for (const div of allDivs) {
              const text = div.textContent || '';
              if ((text.includes('Year Fixed') || text.includes('ARM SOFR')) && 
                  (text.includes('Prime') || text.includes('Non-QM'))) {
                console.log('Found program panel:', text.substring(0, 100));
                return div;
              }
            }
            return null;
          };
          
          // Strategy 2: Extract using Material-UI patterns
          const extractMuiValue = (labelText, panel) => {
            if (!panel) panel = document.body;
            
            // Method 1: Look for label followed by value in Material-UI grid/layout
            const labels = Array.from(panel.querySelectorAll('*'));
            for (const label of labels) {
              const txt = label.textContent || '';
              if (txt.includes(labelText) && txt.length < 50) {
                console.log(\`Found label "\${labelText}" in element:\`, txt);
                
                // Check Material-UI Typography siblings
                const parent = label.parentElement;
                if (parent) {
                  const siblings = Array.from(parent.children);
                  const labelIdx = siblings.indexOf(label);
                  
                  // Look at next few siblings
                  for (let i = labelIdx + 1; i < Math.min(labelIdx + 4, siblings.length); i++) {
                    const sib = siblings[i];
                    const sibText = sib.textContent?.trim();
                    if (sibText && sibText !== txt && /[\d.%$,+-]/.test(sibText)) {
                      console.log(\`  Found value via sibling: \${sibText}\`);
                      return sibText;
                    }
                  }
                  
                  // Look in parent's other children (Material-UI often uses flex/grid)
                  const allChildren = Array.from(parent.querySelectorAll('*'));
                  for (const child of allChildren) {
                    const childText = child.textContent?.trim();
                    if (childText && !childText.includes(labelText) && 
                        childText.length < 30 && /^[\d.%$,+-]+$/.test(childText.replace(/,/g, ''))) {
                      console.log(\`  Found value via parent child: \${childText}\`);
                      return childText;
                    }
                  }
                }
                
                // Method 2: Text-based extraction from same container
                const container = label.closest('div');
                if (container) {
                  const fullText = container.textContent || '';
                  
                  // Try regex patterns
                  const patterns = [
                    new RegExp(labelText.replace(/[(),%$]/g, '\\\\$&') + '[\\s:]*([\\d.,%$+-]+)'),
                    new RegExp(labelText.replace(/[(),%$]/g, '\\\\$&') + '\\n+([\\d.,%$+-]+)'),
                  ];
                  
                  for (const pattern of patterns) {
                    const match = fullText.match(pattern);
                    if (match && match[1]) {
                      console.log(\`  Found value via regex: \${match[1]}\`);
                      return match[1];
                    }
                  }
                }
              }
            }
            
            return null;
          };
          
          // Find the results panel
          const programPanel = findProgramPanel();
          console.log('Program panel found:', !!programPanel);
          
          // Extract values
          const rateRaw = extractMuiValue('Rate, %', programPanel) || extractMuiValue('Rate,%', programPanel);
          const lenderCreditRaw = extractMuiValue('Lender Credit', programPanel);
          const monthlyPaymentRaw = extractMuiValue('Monthly Payment, $', programPanel) || 
                                    extractMuiValue('Monthly Payment,$', programPanel) ||
                                    extractMuiValue('Monthly Payment', programPanel);
          
          // Clean up extracted values
          const cleanNumber = (raw) => {
            if (!raw) return 'N/A';
            return raw.replace(/[%$]/g, '').replace(/,/g, '').trim();
          };
          
          const rate = cleanNumber(rateRaw);
          const discount_points = cleanNumber(lenderCreditRaw);
          const monthly_payment = cleanNumber(monthlyPaymentRaw);
          
          console.log('=== Extraction Results ===');
          console.log('Rate: ' + rate + ' (raw: ' + rateRaw + ')');
          console.log('Lender Credit: ' + discount_points + ' (raw: ' + lenderCreditRaw + ')');
          console.log('Monthly Payment: ' + monthly_payment + ' (raw: ' + monthlyPaymentRaw + ')');
          
          return {
            rate,
            discount_points,
            monthly_payment,
            apr: 'N/A',
            program_name: 'A&D Mortgage Quick Pricer',
            priced_at: new Date().toISOString(),
            raw_values: {
              rate: rateRaw,
              lender_credit: lenderCreditRaw,
              monthly_payment: monthlyPaymentRaw
            }
          };
        });
        
        console.log('Extraction results:', JSON.stringify(extractResults));
        let results = extractResults;
        
        // ========== STEP 7: EXPANDED FAILURE DIAGNOSTICS ==========
        if (results.rate === 'N/A' || results.monthly_payment === 'N/A') {
          log('Failed to extract results, capturing diagnostics...');
          
          let screenshot = null;
          let resultsScreenshot = null;
          let textSamples = [];
          let buttonScanResults = null;
          
          try {
            screenshot = await page.screenshot({ encoding: 'base64', fullPage: false });
            
            const resultsBox = await page.$('div.quickPricerBody_response');
            if (resultsBox) {
              resultsScreenshot = await resultsBox.screenshot({ encoding: 'base64' });
            }
            
            for (let i = 0; i < allFrames.length; i++) {
              try {
                const frameName = i === 0 ? 'main' : \`iframe-\${i}\`;
                const text = await allFrames[i].evaluate(() => (document.body?.innerText || '').substring(0, 600));
                textSamples.push({ frame: frameName, text });
              } catch (e) {}
            }
            
            // Scan all buttons if View Rates failed
            buttonScanResults = await page.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a[role="button"], a.btn'));
              return buttons.slice(0, 30).map((btn, idx) => ({
                index: idx,
                tag: btn.tagName,
                text: (btn.textContent || btn.value || '').trim().substring(0, 100),
                type: btn.getAttribute('type'),
                className: btn.className,
                id: btn.id || null,
                visible: btn.offsetParent !== null,
                enabled: !btn.disabled,
                ariaLabel: btn.getAttribute('aria-label') || null
              }));
            });
            log('Scanned ' + buttonScanResults.length + ' buttons for debugging');
          } catch (e) {
            log('Diagnostic capture error: ' + e.message);
          }
          
          throw new Error(JSON.stringify({
            message: 'Failed to extract valid pricing results',
            rate: results.rate,
            payment: results.monthly_payment,
            debug_text: results.debug_text,
            dom_survey: {
              frame_count: domSurvey.frames.length,
              frames: domSurvey.frames.map(f => ({
                name: f.name,
                fico_candidates: f.anchors.FICO?.candidates.length || 0,
                ltv_candidates: f.anchors.LTV?.candidates.length || 0,
                loan_amt_candidates: f.anchors['Loan Amount']?.candidates.length || 0,
                text_sample: f.textSample.substring(0, 300)
              }))
            },
            text_samples: textSamples,
            button_scan_results: buttonScanResults,
            screenshot: screenshot ? screenshot.substring(0, 150) + '...' : null,
            results_screenshot: resultsScreenshot ? resultsScreenshot.substring(0, 150) + '...' : null,
            debug_logs: debugLogs
          }));
        }
        
        log('Final results: ' + JSON.stringify(results));
        return {
          ...results,
          debug_logs: debugMode ? debugLogs : undefined
        };
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
            scenarioData: scenarioData,
            debugMode: debugMode
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

    // Extract debug logs if present
    const debugLogs = results.debug_logs || [];
    const cleanResults = { ...results };
    delete cleanResults.debug_logs;

    // Update with results
    const updateData: any = {
      status: 'completed',
      completed_at: new Date().toISOString(),
      results_json: cleanResults
    };
    
    if (debugMode && debugLogs.length > 0) {
      updateData.debug_logs = debugLogs;
    }

    const { error: updateError } = await supabase
      .from('pricing_runs')
      .update(updateData)
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

    // Try to save debug data on failure
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      const updateData: any = {
        status: 'failed',
        error_message: errorDetails.message || error.message,
        completed_at: new Date().toISOString(),
        results_json: errorDetails
      };
      
      // Store debug data if available
      if (errorDetails.button_scan_results) {
        updateData.button_scan_results = errorDetails.button_scan_results;
        console.log('[loan-pricer-scraper] Stored button scan results');
      }
      
      if (errorDetails.debug_logs) {
        updateData.debug_logs = errorDetails.debug_logs;
        console.log('[loan-pricer-scraper] Stored debug logs');
      }
      
      // Update pricing run with failed status and debug data
      await supabase
        .from('pricing_runs')
        .update(updateData)
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
