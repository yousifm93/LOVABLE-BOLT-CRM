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
        
        // ========== STEP 1: DOM SURVEY ==========
        let domSurvey = { frames: [] };
        
        async function conductDOMSurvey() {
          console.log('=== Starting DOM Survey ===');
          const allFrames = [page, ...page.frames()];
          
          const ANCHOR_SYNONYMS = {
            'FICO': ['FICO', 'Credit Score', 'FICO Score'],
            'LTV': ['LTV', 'LTV %', 'Loan to Value', 'CLTV', 'LTV/CLTV'],
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
          'LTV': ['LTV', 'LTV %', 'Loan to Value', 'CLTV'],
          'Loan Amount': ['Loan Amount', 'Base Loan Amount', 'Loan Amt']
        };
        
        async function fillNumberInputFrameAware(labelText, value) {
          console.log(\`Filling \${labelText} with \${value} (frame-aware)\`);
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
        await fillDropdownFrameAware(
          ['Program'],
          getSynonyms('program_type', scenarioData.program_type)
        );
        await new Promise(r => setTimeout(r, 500));
        
        await fillDropdownFrameAware(['Citizenship'], [scenarioData.citizenship]);
        await fillDropdownFrameAware(['Occupancy'], [scenarioData.occupancy]);
        await fillDropdownFrameAware(['Purpose'], [scenarioData.loan_purpose]);
        
        if (scenarioData.program_type === 'Non-QM' && scenarioData.income_type) {
          await fillDropdownFrameAware(['Income Type'], [scenarioData.income_type]);
        }
        
        // Fill numeric inputs with frame-aware logic
        console.log('Filling numeric inputs (FICO, LTV, Loan Amount)...');
        await fillNumberInputFrameAware('FICO', scenarioData.fico_score);
        await fillNumberInputFrameAware('LTV', scenarioData.ltv);
        await fillNumberInputFrameAware('Loan Amount', scenarioData.loan_amount);
        
        await new Promise(r => setTimeout(r, 800));
        
        // Lock Period
        const lockValue = scenarioData.lock_period + ' Days';
        await fillDropdownFrameAware(['Lock Period', 'Rate Lock', 'Lock Term'], [lockValue]);
        
        // More dropdowns
        await fillDropdownFrameAware(['State'], getSynonyms('state', scenarioData.state));
        await fillDropdownFrameAware(['Property Type'], getSynonyms('property_type', scenarioData.property_type));
        await fillDropdownFrameAware(['Amortization Type'], getSynonyms('amortization_type', scenarioData.amortization_type));
        
        if (scenarioData.program_type === 'Non-QM') {
          if (scenarioData.mortgage_history) {
            await fillDropdownFrameAware(['Mortgage History'], [scenarioData.mortgage_history]);
          }
          if (scenarioData.credit_events) {
            await fillDropdownFrameAware(['Credit Event'], [scenarioData.credit_events]);
          }
        }
        
        // DTI
        const dtiSynonyms = {
          'DTI <=40%': ['DTI <=40%', '<= 40%', 'DTI <= 40%', '40% or less'],
          'DTI >40%': ['DTI >40%', '> 40%', 'DTI > 40%', 'greater than 40%']
        };
        const dtiOptions = dtiSynonyms[scenarioData.dti] || [scenarioData.dti];
        await fillDropdownFrameAware(['DTI', 'Debt to Income', 'DTI Ratio'], dtiOptions);
        
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
        
        // ========== STEP 4: SMARTER READINESS WAIT ==========
        console.log('Waiting for results to appear...');
        const allFrames = [page, ...page.frames()];
        
        // Wait for "Pricing as of" or results wrapper
        let resultsFound = false;
        for (let attempt = 0; attempt < 2; attempt++) {
          for (const frame of allFrames) {
            try {
              const hasIndicator = await frame.evaluate(() => {
                const text = document.body?.innerText || '';
                return text.toLowerCase().includes('pricing as of') || 
                       text.toLowerCase().includes('rate') ||
                       text.toLowerCase().includes('monthly payment');
              });
              
              if (hasIndicator) {
                console.log('Results indicator detected');
                resultsFound = true;
                break;
              }
            } catch (e) {}
          }
          
          if (resultsFound) break;
          await new Promise(r => setTimeout(r, 2000));
        }
        
        // Wait for both percentage and dollar
        try {
          await page.waitForFunction(() => {
            const text = document.body?.innerText || '';
            const hasRate = /\d+\.\d{2,3}\s*%/.test(text);
            const hasPayment = /\$\s*[\d,]+\.\d{2}/.test(text);
            console.log('Results check: hasRate=' + hasRate + ', hasPayment=' + hasPayment);
            return hasRate && hasPayment;
          }, { timeout: 4000 });
          console.log('✓ Results detected');
        } catch (e) {
          console.warn('Results wait timed out, waiting extra 2s...');
          await new Promise(r => setTimeout(r, 2000));
        }
        
        // ========== STEP 5: FRAME-AWARE RESULTS EXTRACTION ==========
        console.log('Extracting results across all frames...');
        
        // Verify inputs
        const inputVerification = await page.evaluate(() => {
          const getInputValue = (labelText) => {
            const labels = Array.from(document.querySelectorAll('label'));
            const label = labels.find(l => l.textContent?.includes(labelText));
            if (!label) return 'NOT_FOUND';
            
            const container = label.parentElement || label;
            const input = container.querySelector('input[type="number"]') ||
                         container.querySelector('input[type="text"]') ||
                         label.nextElementSibling?.querySelector('input');
            
            return input ? input.value : 'NO_INPUT';
          };
          
          return {
            fico: getInputValue('FICO'),
            ltv: getInputValue('LTV'),
            loanAmount: getInputValue('Loan Amount')
          };
        });
        console.log('Input verification:', JSON.stringify(inputVerification));
        
        // Extract helper (label-directed + siblings)
        function extractByLabel(container, labelText, pattern) {
          try {
            // Find label element
            const elements = Array.from(container.querySelectorAll('*'));
            for (const el of elements) {
              const text = el.textContent || '';
              if (text.toLowerCase().includes(labelText.toLowerCase()) && text.length < 50) {
                // Check siblings
                const parent = el.parentElement;
                if (parent) {
                  const siblings = Array.from(parent.children);
                  for (const sibling of siblings) {
                    const sibText = sibling.textContent || '';
                    const match = sibText.match(pattern);
                    if (match && match[1]) {
                      console.log('Extracted ' + labelText + ' from sibling: ' + match[1]);
                      return match[1];
                    }
                  }
                }
                
                // Next sibling
                let next = el.nextElementSibling;
                if (next) {
                  const nextText = next.textContent || '';
                  const match = nextText.match(pattern);
                  if (match && match[1]) {
                    console.log('Extracted ' + labelText + ' from next sibling: ' + match[1]);
                    return match[1];
                  }
                }
              }
            }
            
            // Line-by-line
            const allText = container.innerText || container.textContent || '';
            const lines = allText.split('\n');
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(labelText.toLowerCase())) {
                for (let j = i; j < Math.min(i + 4, lines.length); j++) {
                  const match = lines[j].match(pattern);
                  if (match && match[1]) return match[1];
                }
              }
            }
            
            return null;
          } catch (e) {
            console.error('extractByLabel error:', e.message);
            return null;
          }
        }
        
        let results = { rate: 'N/A', monthly_payment: 'N/A', discount_points: 'N/A', apr: 'N/A', program_name: 'Quick Pricer Result', priced_at: new Date().toISOString() };
        
        // Try main document
        const mainResults = await page.evaluate((extractFn) => {
          eval('var extractByLabel = ' + extractFn);
          
          const responseBox = document.querySelector('div.quickPricerBody_response') ||
                              document.querySelector('[class*="quickPricer"][class*="response"]') ||
                              document.body;
          
          const allText = responseBox.innerText || responseBox.textContent || '';
          const out = { rate: 'N/A', monthly_payment: 'N/A', discount_points: 'N/A', debug_text: allText.substring(0, 800) };
          
          const rateByLabel = extractByLabel(responseBox, 'rate', /(\d+\.\d{2,3})\s*%/);
          const paymentByLabel = extractByLabel(responseBox, 'payment', /\$\s*([\d,]+\.\d{2})/);
          const creditByLabel = extractByLabel(responseBox, 'credit', /([\-]?\d+\.\d{2,3})/);
          
          if (rateByLabel) out.rate = rateByLabel;
          if (paymentByLabel) out.monthly_payment = paymentByLabel.replace(/,/g, '');
          if (creditByLabel) out.discount_points = creditByLabel;
          
          // Fallback regex
          if (out.rate === 'N/A') {
            const rateMatch = allText.match(/(\d+\.\d{2,3})\s*%/);
            if (rateMatch) out.rate = rateMatch[1];
          }
          if (out.monthly_payment === 'N/A') {
            const paymentMatch = allText.match(/\$\s*([\d,]+\.\d{2})/);
            if (paymentMatch) out.monthly_payment = paymentMatch[1].replace(/,/g, '');
          }
          if (out.discount_points === 'N/A') {
            const creditMatch = allText.match(/([\-]?\d+\.\d{3})/);
            if (creditMatch && creditMatch[1] !== out.rate) out.discount_points = creditMatch[1];
          }
          
          return out;
        }, extractByLabel.toString());
        
        console.log('Main document results:', JSON.stringify(mainResults));
        results = { ...results, ...mainResults };
        
        // Try iframes if main failed
        if (results.rate === 'N/A' || results.monthly_payment === 'N/A') {
          console.log('Checking iframes...');
          for (let i = 1; i < allFrames.length; i++) {
            try {
              const frameResults = await allFrames[i].evaluate(() => {
                const text = document.body?.innerText || '';
                const out = { rate: 'N/A', monthly_payment: 'N/A', discount_points: 'N/A', debug_text: text.substring(0, 800) };
                
                const rateMatch = text.match(/(\d+\.\d{2,3})\s*%/);
                const paymentMatch = text.match(/\$\s*([\d,]+\.\d{2})/);
                const creditMatch = text.match(/([\-]?\d+\.\d{3})/);
                
                if (rateMatch) out.rate = rateMatch[1];
                if (paymentMatch) out.monthly_payment = paymentMatch[1].replace(/,/g, '');
                if (creditMatch && creditMatch[1] !== out.rate) out.discount_points = creditMatch[1];
                
                return out;
              });
              
              if (frameResults.rate !== 'N/A' && frameResults.monthly_payment !== 'N/A') {
                console.log(\`Found results in iframe \${i}\`);
                results = { ...results, ...frameResults };
                break;
              }
            } catch (e) {}
          }
        }
        
        // ========== STEP 6: EXPANDED FAILURE DIAGNOSTICS ==========
        if (results.rate === 'N/A' || results.monthly_payment === 'N/A') {
          console.error('Failed to extract results, capturing diagnostics...');
          
          let screenshot = null;
          let resultsScreenshot = null;
          let textSamples = [];
          
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
          } catch (e) {
            console.error('Diagnostic capture error:', e.message);
          }
          
          throw new Error(JSON.stringify({
            message: 'Failed to extract valid pricing results',
            rate: results.rate,
            payment: results.monthly_payment,
            debug_text: results.debug_text,
            input_verification: inputVerification,
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
            screenshot: screenshot ? screenshot.substring(0, 150) + '...' : null,
            results_screenshot: resultsScreenshot ? resultsScreenshot.substring(0, 150) + '...' : null
          }));
        }
        
        console.log('Final results:', JSON.stringify(results));
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
