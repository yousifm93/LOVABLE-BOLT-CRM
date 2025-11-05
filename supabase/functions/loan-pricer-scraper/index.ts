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

const SELECTORS = {
  // Spinbutton inputs (in order)
  ficoScore: "input[role='spinbutton'][aria-live='assertive']:nth-of-type(1)",
  ltvSlider: "input[role='spinbutton'][aria-live='assertive']:nth-of-type(2)",
  loanAmount: "input[role='spinbutton'][aria-live='assertive']:nth-of-type(3)",
  
  // Dropdowns (Material-UI style buttons)
  programTypeButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(1)",
  citizenshipButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(2)",
  occupancyButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(3)",
  purposeButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(4)",
  amortizationButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(5)",
  propertyTypeButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(6)",
  unitsButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(7)",
  lockPeriodButton: "div[aria-haspopup='listbox'][role='button']:nth-of-type(8)",
  
  // Comboboxes (type-to-search style)
  stateCombobox: "div[role='combobox'] input",
  brokerCompCombobox: "div[role='combobox'] input[value='BPC']",
  
  // Checkboxes (adjust positions as needed based on testing)
  adminFeeCheckbox: "input[type='checkbox']:nth-of-type(1)",
  escrowWaiverCheckbox: "input[type='checkbox']:nth-of-type(2)",
  highBalanceCheckbox: "input[type='checkbox']:nth-of-type(6)",
  subFinancingCheckbox: "input[type='checkbox']:nth-of-type(7)",
  
  // Results
  rateInput: "input[aria-label='Rate']",
  paymentInput: "input[aria-label='Monthly payment']",
  pointsInput: "input[aria-label='Lender Credit']",
  aprInput: "input[aria-label='APR']",
  
  // XPath selectors
  shareButtonXPath: "//button[contains(., 'Share')]",
  programNameXPath: "//div[contains(text(), 'Year Fixed')]"
};

// Helper to click a custom dropdown and select an option by text
async function selectDropdownByText(page: any, buttonSelector: string, optionText: string) {
  console.log(`[selectDropdown] Clicking dropdown: ${buttonSelector}, looking for: ${optionText}`);
  
  // Click the dropdown button to open it
  await page.click(buttonSelector);
  
  // Wait for the listbox to appear
  await page.waitForSelector('[role="listbox"]', { visible: true, timeout: 5000 });
  await page.waitForTimeout(300);
  
  // Click the option with matching text using XPath
  const optionXPath = `//li[@role="option"][contains(., "${optionText}")]`;
  const options = await page.$x(optionXPath);
  
  if (options.length > 0) {
    console.log(`[selectDropdown] Found ${options.length} matching options, clicking first`);
    await options[0].click();
    await page.waitForTimeout(500); // Wait for dropdown to close
  } else {
    throw new Error(`Option "${optionText}" not found in dropdown`);
  }
}

// Helper to type into a combobox (for state, income type)
async function typeIntoCombobox(page: any, comboboxSelector: string, value: string) {
  console.log(`[typeCombobox] Typing "${value}" into ${comboboxSelector}`);
  
  await page.click(comboboxSelector);
  await page.waitForTimeout(300);
  
  // Clear existing value
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  
  // Type new value
  await page.type(comboboxSelector, value);
  await page.waitForTimeout(500);
  
  // Press Enter to confirm
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
}

// Helper to set checkbox state
async function setCheckbox(page: any, checkboxSelector: string, checked: boolean) {
  console.log(`[setCheckbox] Setting ${checkboxSelector} to ${checked}`);
  
  try {
    const checkbox = await page.$(checkboxSelector);
    if (!checkbox) {
      console.log(`[setCheckbox] Checkbox not found: ${checkboxSelector}, skipping`);
      return;
    }
    
    const isChecked = await page.evaluate((el: any) => el.checked, checkbox);
    
    if (isChecked !== checked) {
      await checkbox.click();
      await page.waitForTimeout(300);
    }
  } catch (error) {
    console.error(`[setCheckbox] Error setting checkbox ${checkboxSelector}:`, error);
  }
}

// Helper to set spinbutton value
async function setSpinbutton(page: any, inputSelector: string, value: number) {
  console.log(`[setSpinbutton] Setting ${inputSelector} to ${value}`);
  
  await page.click(inputSelector);
  await page.waitForTimeout(200);
  
  // Select all and replace
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  
  await page.type(inputSelector, value.toString());
  await page.keyboard.press('Tab'); // Move focus to commit the value
  await page.waitForTimeout(300);
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
    console.log('[loan-pricer-scraper] Scenario:', JSON.stringify(scenarioData, null, 2));

    // Update status to running
    await supabase
      .from('pricing_runs')
      .update({ 
        status: 'running',
        started_at: new Date().toISOString()
      })
      .eq('id', run_id);

    // Connect to Browserless
    const browserlessToken = Deno.env.get('BROWSERLESS_API_KEY');
    if (!browserlessToken) {
      throw new Error('BROWSERLESS_API_KEY not configured');
    }

    const browserWSEndpoint = `wss://chrome.browserless.io?token=${browserlessToken}`;
    console.log('[loan-pricer-scraper] Connecting to Browserless...');

    let browser;
    let page;
    
    try {
      browser = await puppeteer.connect({ browserWSEndpoint });
      page = await browser.newPage();
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      console.log('[loan-pricer-scraper] Navigating to pricer...');
      await page.goto('https://pricer.admortgage.com/', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      console.log('[loan-pricer-scraper] Page loaded, filling form...');
      
      // Fill basic spinbutton fields
      await setSpinbutton(page, SELECTORS.ficoScore, scenarioData.fico_score);
      await setSpinbutton(page, SELECTORS.ltvSlider, scenarioData.ltv);
      await setSpinbutton(page, SELECTORS.loanAmount, scenarioData.loan_amount);
      
      // Select program type FIRST (this may show/hide other fields)
      console.log('[loan-pricer-scraper] Selecting program type:', scenarioData.program_type);
      await selectDropdownByText(page, SELECTORS.programTypeButton, scenarioData.program_type);
      
      // Wait a bit for any conditional fields to appear/disappear
      await page.waitForTimeout(1000);
      
      // Fill dropdowns
      await selectDropdownByText(page, SELECTORS.citizenshipButton, scenarioData.citizenship);
      await selectDropdownByText(page, SELECTORS.occupancyButton, scenarioData.occupancy);
      await selectDropdownByText(page, SELECTORS.purposeButton, scenarioData.loan_purpose);
      await selectDropdownByText(page, SELECTORS.amortizationButton, scenarioData.amortization_type);
      await selectDropdownByText(page, SELECTORS.propertyTypeButton, scenarioData.property_type);
      await selectDropdownByText(page, SELECTORS.unitsButton, `${scenarioData.num_units} Unit`);
      await selectDropdownByText(page, SELECTORS.lockPeriodButton, `${scenarioData.lock_period} Days`);
      
      // Type state into combobox
      await typeIntoCombobox(page, SELECTORS.stateCombobox, scenarioData.state);
      
      // Set checkboxes
      await setCheckbox(page, SELECTORS.adminFeeCheckbox, scenarioData.admin_fee_buyout);
      await setCheckbox(page, SELECTORS.escrowWaiverCheckbox, scenarioData.escrow_waiver);
      await setCheckbox(page, SELECTORS.highBalanceCheckbox, scenarioData.high_balance);
      await setCheckbox(page, SELECTORS.subFinancingCheckbox, scenarioData.sub_financing);
      
      // Handle Non-QM specific fields
      if (scenarioData.program_type === "Non-QM") {
        console.log('[loan-pricer-scraper] Filling Non-QM specific fields...');
        
        // Wait for Non-QM fields to appear
        await page.waitForTimeout(1000);
        
        // Income Type (combobox)
        if (scenarioData.income_type) {
          try {
            await typeIntoCombobox(page, SELECTORS.stateCombobox, scenarioData.income_type);
          } catch (error) {
            console.error('[loan-pricer-scraper] Error setting income_type:', error);
          }
        }
        
        // Mortgage History (dropdown)
        if (scenarioData.mortgage_history) {
          try {
            const mortgageXPath = "//div[@role='button'][contains(., 'x30x12')]";
            const mortgageButtons = await page.$x(mortgageXPath);
            if (mortgageButtons.length > 0) {
              await mortgageButtons[0].click();
              await page.waitForSelector('[role="listbox"]', { visible: true, timeout: 3000 });
              
              const optionXPath = `//li[@role="option"][contains(., "${scenarioData.mortgage_history}")]`;
              const options = await page.$x(optionXPath);
              if (options.length > 0) {
                await options[0].click();
                await page.waitForTimeout(500);
              }
            }
          } catch (error) {
            console.error('[loan-pricer-scraper] Error setting mortgage_history:', error);
          }
        }
        
        // Credit Events (dropdown)
        if (scenarioData.credit_events) {
          try {
            const creditXPath = "//div[@role='button'][contains(., 'months')]";
            const creditButtons = await page.$x(creditXPath);
            if (creditButtons.length > 0) {
              await creditButtons[0].click();
              await page.waitForSelector('[role="listbox"]', { visible: true, timeout: 3000 });
              
              const optionXPath = `//li[@role="option"][contains(., "${scenarioData.credit_events}")]`;
              const options = await page.$x(optionXPath);
              if (options.length > 0) {
                await options[0].click();
                await page.waitForTimeout(500);
              }
            }
          } catch (error) {
            console.error('[loan-pricer-scraper] Error setting credit_events:', error);
          }
        }
      }
      
      // Click the Share button to trigger calculation
      console.log('[loan-pricer-scraper] Submitting form...');
      const shareButtons = await page.$x(SELECTORS.shareButtonXPath);
      if (shareButtons.length === 0) {
        throw new Error('Share button not found');
      }
      await shareButtons[0].click();
      
      // Wait for results to appear
      console.log('[loan-pricer-scraper] Waiting for results...');
      await page.waitForSelector(SELECTORS.rateInput, { visible: true, timeout: 15000 });
      await page.waitForTimeout(2000); // Extra wait for all results to populate
      
      // Extract results
      const rate = await page.$eval(SELECTORS.rateInput, (el: any) => el.value);
      const payment = await page.$eval(SELECTORS.paymentInput, (el: any) => el.value);
      const points = await page.$eval(SELECTORS.pointsInput, (el: any) => el.value);
      const apr = await page.$eval(SELECTORS.aprInput, (el: any) => el.value);
      
      // Extract program name (optional)
      let programName = `${scenarioData.program_type} ${scenarioData.amortization_type}`;
      try {
        const programElements = await page.$x(SELECTORS.programNameXPath);
        if (programElements.length > 0) {
          programName = await page.evaluate((el: any) => el.textContent, programElements[0]);
        }
      } catch (e) {
        console.log('[loan-pricer-scraper] Could not extract program name:', e);
      }
      
      const results = {
        rate: rate,
        monthly_payment: payment,
        discount_points: points,
        apr: apr,
        program_name: programName.trim(),
        priced_at: new Date().toISOString(),
        ...(scenarioData.program_type === "Non-QM" && {
          non_qm_details: {
            income_type: scenarioData.income_type,
            mortgage_history: scenarioData.mortgage_history,
            credit_events: scenarioData.credit_events
          }
        })
      };
      
      console.log('[loan-pricer-scraper] Results extracted:', JSON.stringify(results, null, 2));
      
      // Update database with results
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
      
      await browser.close();
      
      console.log('[loan-pricer-scraper] Completed successfully');
      
      return new Response(
        JSON.stringify({ success: true, results }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
      
    } catch (scrapingError: any) {
      console.error('[loan-pricer-scraper] Scraping error:', scrapingError);
      
      // Capture screenshot for debugging
      if (page) {
        try {
          const screenshot = await page.screenshot({ encoding: 'base64' });
          console.log('[loan-pricer-scraper] Screenshot captured (first 100 chars):', screenshot.substring(0, 100) + '...');
          // Optionally save to Supabase storage or include in error
        } catch (screenshotError) {
          console.error('[loan-pricer-scraper] Could not capture screenshot:', screenshotError);
        }
      }
      
      if (browser) {
        await browser.close();
      }
      
      // Update run as failed
      await supabase
        .from('pricing_runs')
        .update({
          status: 'failed',
          error_message: scrapingError.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', run_id);
      
      throw scrapingError;
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
