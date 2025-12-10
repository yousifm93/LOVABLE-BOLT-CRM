import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationData {
  loanPurpose?: string;
  mortgageInfo: {
    propertyType?: string;
    occupancy?: string;
    purchasePrice?: string;
    downPaymentAmount?: string;
    comfortableMonthlyPayment?: string;
    monthlyPayment?: string;
    transactionType?: string;
    location?: {
      city?: string;
      state?: string;
      zipCode?: string;
      countyName?: string;
    };
    city?: string;
    state?: string;
    zipCode?: string;
  };
  personalInfo: {
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    cellPhone?: string;
    email: string;
    dateOfBirth?: string;
    dob?: string;
    birthDate?: string;
    estimatedCreditScore?: string;
    maritalStatus?: string;
    residencyType?: string;
    gender?: string;
    currentAddress?: {
      street?: string;
      streetAddress?: string;
      address?: string;
      unit?: string;
      addressLine2?: string;
      apt?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      zip?: string;
      postalCode?: string;
    };
    streetAddress?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    zip?: string;
    yearsAtCurrentAddress?: string | number;
    monthsAtCurrentAddress?: string | number;
    years?: string | number;
    months?: string | number;
    residenceYears?: string | number;
    residenceMonths?: string | number;
    yearsAtAddress?: string | number;
    monthsAtAddress?: string | number;
    ownOrRent?: string;
    propertyOwnership?: string;
    militaryVeteran?: boolean;
  };
  coBorrowers?: {
    applySolelyByMyself?: boolean;
    coBorrowers?: Array<{
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      relationship?: string;
    }>;
  };
  income?: {
    employmentIncomes: Array<any>;
    otherIncomes: Array<any>;
    hasNoIncome?: boolean;
    totalMonthlyIncome?: number;
  };
  assets?: {
    assets: Array<any>;
  };
  realEstate?: {
    properties: Array<any>;
  };
  declarations: Array<{
    id: string;
    answer: boolean | null;
  }>;
  demographics?: {
    ethnicity?: string;
    race?: string;
    gender?: string;
  };
}

// ============= VALUE NORMALIZATION MAPS =============

// Normalize loan_type to Title Case (matching CRM dropdown)
const loanTypeMap: Record<string, string> = {
  'purchase': 'Purchase',
  'refinance': 'Refinance',
  'refi': 'Refinance',
  'heloc': 'HELOC',
  'cash-out': 'Refinance',
  'cash_out': 'Refinance',
};

// Normalize property_type to match CRM dropdown exactly
const propertyTypeMap: Record<string, string> = {
  'single-family': 'Single Family',
  'single_family': 'Single Family',
  'singlefamily': 'Single Family',
  'single family': 'Single Family',
  'sfr': 'Single Family',
  'condo': 'Condo',
  'condominium': 'Condo',
  'townhouse': 'Townhouse',
  'townhome': 'Townhouse',
  'multi-family': 'Multi-Family',
  'multifamily': 'Multi-Family',
  'multi_family': 'Multi-Family',
  '2-4 units': 'Multi-Family',
  '2-4units': 'Multi-Family',
  'other': 'Other',
};

// Normalize occupancy to match CRM dropdown
const occupancyMap: Record<string, string> = {
  'primary-residence': 'Primary Home',
  'primary': 'Primary Home',
  'primary_residence': 'Primary Home',
  'primaryhome': 'Primary Home',
  'primary home': 'Primary Home',
  'owner-occupied': 'Primary Home',
  'second-home': 'Second Home',
  'second_home': 'Second Home',
  'secondhome': 'Second Home',
  'second home': 'Second Home',
  'vacation': 'Second Home',
  'investment': 'Investment',
  'rental': 'Investment',
  'investment property': 'Investment',
  'non-owner': 'Investment',
};

// Normalize own/rent to UPPERCASE
const ownRentMap: Record<string, string> = {
  'rent': 'RENT',
  'renting': 'RENT',
  'renter': 'RENT',
  'own': 'OWN',
  'owned': 'OWN',
  'owner': 'OWN',
  'living-rent-free': 'Living Rent-Free',
  'living_rent_free': 'Living Rent-Free',
  'rent-free': 'Living Rent-Free',
  'rent free': 'Living Rent-Free',
};

// Normalize residency type to match CRM dropdown
const residencyTypeMap: Record<string, string> = {
  'us-citizen': 'US Citizen',
  'us_citizen': 'US Citizen',
  'uscitizen': 'US Citizen',
  'citizen': 'US Citizen',
  'us citizen': 'US Citizen',
  'permanent-resident': 'Permanent Resident',
  'permanent_resident': 'Permanent Resident',
  'permanentresident': 'Permanent Resident',
  'permanent resident': 'Permanent Resident',
  'green card': 'Permanent Resident',
  'non-permanent-resident': 'Non-Permanent Resident',
  'non_permanent_resident': 'Non-Permanent Resident',
  'nonpermanentresident': 'Non-Permanent Resident',
  'non-permanent resident': 'Non-Permanent Resident',
  'visa': 'Non-Permanent Resident',
  'foreign-national': 'Foreign National',
  'foreign_national': 'Foreign National',
  'foreignnational': 'Foreign National',
  'foreign national': 'Foreign National',
  'foreign': 'Foreign National',
};

// Normalize gender to match CRM dropdown
const genderMap: Record<string, string> = {
  'male': 'Male',
  'm': 'Male',
  'female': 'Female',
  'f': 'Female',
  'other': 'Other',
  'prefer-not-to-say': 'Prefer not to say',
  'prefer_not_to_say': 'Prefer not to say',
  'prefernotosay': 'Prefer not to say',
  'prefer not to say': 'Prefer not to say',
  'decline': 'Prefer not to say',
};

// Map marital status values
const maritalStatusMap: Record<string, string> = {
  'single': 'Single',
  'married': 'Married',
  'separated': 'Separated',
  'unmarried': 'Single',
  'divorced': 'Separated',
  'widowed': 'Single',
};

// Helper to normalize a value using a map
const normalizeValue = (value: string | null | undefined, map: Record<string, string>): string | null => {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  return map[lower] || value;
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationData } = await req.json() as { applicationData: ApplicationData };

    if (!applicationData || !applicationData.personalInfo) {
      throw new Error('Invalid application data');
    }

    console.log('Processing mortgage application submission...');
    console.log('Received application data:', JSON.stringify(applicationData, null, 2));

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { personalInfo, mortgageInfo, coBorrowers, income, assets, realEstate, declarations, demographics } = applicationData;

    console.log('Personal Info:', JSON.stringify(personalInfo, null, 2));
    console.log('Mortgage Info:', JSON.stringify(mortgageInfo, null, 2));
    console.log('Income:', JSON.stringify(income, null, 2));

    // ============= INCOME CALCULATION - CHECK ALL POSSIBLE FIELD NAMES =============
    const totalMonthlyIncome = (income?.employmentIncomes || []).reduce((sum: number, emp: any) => {
      // Check all possible field names for monthly income
      const raw = emp.monthlyIncome || emp.monthlyAmount || emp.income || emp.basePay || 
                  emp.grossIncome || emp.monthlyGrossIncome || emp.salary || emp.monthlySalary ||
                  emp.baseIncome || emp.amount || 0;
      let monthlyIncome: number;
      if (typeof raw === 'string') {
        monthlyIncome = parseFloat(raw.replace(/[,$]/g, '')) || 0;
      } else {
        monthlyIncome = raw || 0;
      }
      console.log(`Employment income entry: ${JSON.stringify(emp)}, parsed monthly: ${monthlyIncome}`);
      return sum + monthlyIncome;
    }, 0) + (income?.otherIncomes || []).reduce((sum: number, inc: any) => {
      const raw = inc.amount || inc.monthlyAmount || inc.monthlyIncome || inc.income || 0;
      let amount: number;
      if (typeof raw === 'string') {
        amount = parseFloat(raw.replace(/[,$]/g, '')) || 0;
      } else {
        amount = raw || 0;
      }
      // Handle annual vs monthly frequency
      if (inc.frequency === 'annually' || inc.frequency === 'annual' || inc.frequency === 'yearly') {
        amount = amount / 12;
      }
      console.log(`Other income entry: ${JSON.stringify(inc)}, parsed amount: ${amount}`);
      return sum + amount;
    }, 0);

    // Also check if totalMonthlyIncome was pre-calculated
    const finalMonthlyIncome = totalMonthlyIncome > 0 ? totalMonthlyIncome : (income?.totalMonthlyIncome || 0);
    console.log(`Calculated total monthly income: ${finalMonthlyIncome}`);

    // Calculate total assets - handle both string and number types
    const totalAssets = (assets?.assets || []).reduce((sum: number, asset: any) => {
      const raw = asset.balance || asset.marketValue || asset.cashValue || asset.value || asset.amount || 0;
      let balance: number;
      if (typeof raw === 'string') {
        balance = parseFloat(raw.replace(/[,$]/g, '')) || 0;
      } else {
        balance = raw || 0;
      }
      return sum + balance;
    }, 0);

    // Calculate monthly liabilities from real estate (expenses only, not rent)
    const monthlyLiabilities = (realEstate?.properties || []).reduce((sum: number, property: any) => {
      const raw = property.monthlyExpenses || property.expenses || 0;
      let expenses: number;
      if (typeof raw === 'string') {
        expenses = parseFloat(raw.replace(/[,$]/g, '')) || 0;
      } else {
        expenses = raw || 0;
      }
      return sum + expenses;
    }, 0);

    // Map credit score - handle both numeric input (777) and dropdown values (740-plus)
    const creditScoreMap: Record<string, number> = {
      '740-plus': 760,
      '740+': 760,
      '700-739': 720,
      '660-699': 680,
      '620-660': 640,
      'below-620': 580,
    };

    let ficoScore: number | null = null;
    if (personalInfo.estimatedCreditScore) {
      const raw = personalInfo.estimatedCreditScore;
      // Check if it's already a number or a numeric string
      const parsed = parseInt(raw);
      if (!isNaN(parsed) && parsed >= 300 && parsed <= 850) {
        ficoScore = parsed;
      } else if (creditScoreMap[raw]) {
        ficoScore = creditScoreMap[raw];
      } else if (creditScoreMap[raw.toLowerCase()]) {
        ficoScore = creditScoreMap[raw.toLowerCase()];
      }
    }
    console.log(`Credit score raw: ${personalInfo.estimatedCreditScore}, mapped: ${ficoScore}`);

    // Parse sales price and down payment - handle both string and number
    const parseCurrency = (value: any): number => {
      if (!value) return 0;
      if (typeof value === 'number') return value;
      return parseFloat(String(value).replace(/[,$]/g, '')) || 0;
    };

    const salesPrice = parseCurrency(mortgageInfo.purchasePrice);
    const downPayment = parseCurrency(mortgageInfo.downPaymentAmount);
    const loanAmount = salesPrice - downPayment;
    
    console.log(`Sales price: ${salesPrice}, Down payment: ${downPayment}, Loan amount: ${loanAmount}`);

    // Calculate Principal & Interest (P&I) using standard amortization formula
    const interestRate = 7.0; // 7% default
    const termMonths = 360; // 30 years default
    const monthlyRate = interestRate / 100 / 12;
    const principalInterest = loanAmount > 0 
      ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1))
      : 0;
    
    // Property taxes: 1.5% of purchase price / 12 (annual to monthly)
    const propertyTaxes = salesPrice > 0 ? Math.round(salesPrice * 0.015 / 12) : 0;

    // Insurance based on property type (from loan pricer logic)
    const rawPropertyType = mortgageInfo.propertyType?.toLowerCase() || '';
    const isCondo = rawPropertyType.includes('condo');
    const homeownersInsurance = isCondo ? 75 : Math.round((salesPrice / 100000) * 75);
    
    // HOA dues - only for condos
    const hoaDues = isCondo ? Math.round((salesPrice / 100000) * 150) : 0;
    
    // Calculate total PITI
    const piti = principalInterest + propertyTaxes + homeownersInsurance + hoaDues;

    console.log(`PITI breakdown - P&I: ${principalInterest}, Taxes: ${propertyTaxes}, Insurance: ${homeownersInsurance}, HOA: ${hoaDues}, Total: ${piti}`);

    // Generate MB reference number
    const mbRefNumber = `MB-${Date.now().toString().slice(-8)}`;
    const currentTimestamp = new Date().toISOString();

    // ============= PARSE AND NORMALIZE FIELDS =============

    // Parse property ownership - handle multiple field names
    const rawPropertyOwnership = personalInfo.propertyOwnership || personalInfo.ownOrRent || null;
    const normalizedOwnRent = normalizeValue(rawPropertyOwnership, ownRentMap);
    console.log(`Property ownership raw: ${rawPropertyOwnership}, normalized: ${normalizedOwnRent}`);

    // Parse monthly payment goal - handle various field names and formats
    const monthlyPmtGoal = parseCurrency(
      mortgageInfo.comfortableMonthlyPayment || 
      mortgageInfo.monthlyPayment
    );
    console.log(`Monthly payment goal: ${monthlyPmtGoal}`);

    // Parse years/months at address - handle multiple field names
    const parseNumber = (value: any): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = typeof value === 'string' ? parseInt(value) : value;
      return isNaN(num) ? null : num;
    };

    const yearsAtAddress = parseNumber(
      personalInfo.yearsAtCurrentAddress || 
      personalInfo.years || 
      personalInfo.residenceYears || 
      personalInfo.yearsAtAddress
    );
    const monthsAtAddress = parseNumber(
      personalInfo.monthsAtCurrentAddress || 
      personalInfo.months || 
      personalInfo.residenceMonths || 
      personalInfo.monthsAtAddress
    );
    console.log(`Years at address: ${yearsAtAddress}, Months: ${monthsAtAddress}`);

    // Build current address string - handle multiple structures
    let borrowerCurrentAddress: string | null = null;
    if (personalInfo.currentAddress) {
      const addr = personalInfo.currentAddress;
      const parts = [
        addr.street || addr.streetAddress || addr.address,
        addr.unit || addr.addressLine2 || addr.apt,
        addr.city,
        addr.state,
        addr.zipCode || addr.zip || addr.postalCode
      ].filter(Boolean);
      borrowerCurrentAddress = parts.length > 0 ? parts.join(', ') : null;
    } else {
      // Try flat field names on personalInfo
      const parts = [
        personalInfo.streetAddress || personalInfo.address,
        personalInfo.city,
        personalInfo.state,
        personalInfo.zipCode || personalInfo.zip
      ].filter(Boolean);
      if (parts.length > 0) borrowerCurrentAddress = parts.join(', ');
    }
    console.log(`Borrower current address: ${borrowerCurrentAddress}`);

    // Get location fields - check multiple possible structures
    const subjectCity = mortgageInfo.location?.city || mortgageInfo.city || null;
    const subjectState = mortgageInfo.location?.state || mortgageInfo.state || null;
    const subjectZip = mortgageInfo.location?.zipCode || mortgageInfo.zipCode || null;
    console.log(`Subject location - City: ${subjectCity}, State: ${subjectState}, Zip: ${subjectZip}`);

    // Get marital status with normalization
    const rawMaritalStatus = personalInfo.maritalStatus;
    const normalizedMaritalStatus = normalizeValue(rawMaritalStatus, maritalStatusMap);
    console.log(`Marital status raw: ${rawMaritalStatus}, normalized: ${normalizedMaritalStatus}`);

    // Get residency type with normalization
    const rawResidencyType = personalInfo.residencyType;
    const normalizedResidencyType = normalizeValue(rawResidencyType, residencyTypeMap);
    console.log(`Residency type raw: ${rawResidencyType}, normalized: ${normalizedResidencyType}`);

    // Get gender - check both personalInfo and demographics, then normalize
    const rawGender = demographics?.gender || personalInfo.gender || null;
    const normalizedGender = normalizeValue(rawGender, genderMap);
    console.log(`Gender raw: ${rawGender}, normalized: ${normalizedGender}`);

    // Get transaction type - check multiple possible field names, then normalize
    const rawTransactionType = mortgageInfo.transactionType || applicationData.loanPurpose || null;
    const normalizedLoanType = normalizeValue(rawTransactionType, loanTypeMap);
    console.log(`Transaction type raw: ${rawTransactionType}, normalized: ${normalizedLoanType}`);

    // Get property type with normalization
    const normalizedPropertyType = normalizeValue(mortgageInfo.propertyType, propertyTypeMap);
    console.log(`Property type raw: ${mortgageInfo.propertyType}, normalized: ${normalizedPropertyType}`);

    // Get occupancy with normalization
    const normalizedOccupancy = normalizeValue(mortgageInfo.occupancy, occupancyMap);
    console.log(`Occupancy raw: ${mortgageInfo.occupancy}, normalized: ${normalizedOccupancy}`);

    // Get date of birth - check multiple field names
    const dateOfBirth = personalInfo.dateOfBirth || personalInfo.dob || personalInfo.birthDate || null;
    console.log(`Date of birth: ${dateOfBirth}`);

    // Calculate REO owned based on properties
    const reoOwned = realEstate?.properties && realEstate.properties.length > 0;
    console.log(`REO owned: ${reoOwned}`);

    // Cash to close = down payment (will add closing costs later when available)
    const cashToClose = downPayment;

    // Prepare lead data with normalized values
    const leadData = {
      first_name: personalInfo.firstName,
      last_name: personalInfo.lastName,
      middle_name: personalInfo.middleName || null,
      phone: personalInfo.phone || personalInfo.cellPhone || null,
      email: personalInfo.email,
      dob: dateOfBirth,
      fico_score: ficoScore,
      marital_status: normalizedMaritalStatus,
      residency_type: normalizedResidencyType,
      borrower_current_address: borrowerCurrentAddress,
      time_at_current_address_years: yearsAtAddress,
      time_at_current_address_months: monthsAtAddress,
      own_rent_current_address: normalizedOwnRent,
      military_veteran: personalInfo.militaryVeteran || false,
      
      // Transaction and property info - NORMALIZED VALUES
      loan_type: normalizedLoanType,
      property_type: normalizedPropertyType,
      occupancy: normalizedOccupancy,
      sales_price: salesPrice || null,
      loan_amount: loanAmount || null,
      down_pmt: downPayment > 0 ? String(downPayment) : null,
      monthly_pmt_goal: monthlyPmtGoal > 0 ? monthlyPmtGoal : null,
      cash_to_close: cashToClose > 0 ? cashToClose : null,
      
      // REO owned
      reo: reoOwned,
      
      // Auto-calculated PITI fields
      principal_interest: principalInterest > 0 ? principalInterest : null,
      homeowners_insurance: homeownersInsurance > 0 ? homeownersInsurance : null,
      property_taxes: propertyTaxes > 0 ? propertyTaxes : null,
      hoa_dues: hoaDues > 0 ? hoaDues : null,
      piti: piti > 0 ? piti : null,
      interest_rate: interestRate,
      term: termMonths,
      
      // Subject property address - use actual address from application
      subject_address_1: mortgageInfo.location?.address || 
                         (mortgageInfo as any).propertyAddress || 
                         (mortgageInfo as any).subjectAddress ||
                         null,
      subject_address_2: null,
      subject_city: subjectCity,
      subject_state: subjectState,
      subject_zip: subjectZip,
      
      // Financial info
      total_monthly_income: finalMonthlyIncome > 0 ? finalMonthlyIncome : null,
      assets: totalAssets > 0 ? totalAssets : null,
      monthly_liabilities: monthlyLiabilities > 0 ? monthlyLiabilities : null,
      
      // Co-borrower information
      co_borrower_first_name: coBorrowers?.coBorrowers?.[0]?.firstName || null,
      co_borrower_last_name: coBorrowers?.coBorrowers?.[0]?.lastName || null,
      co_borrower_email: coBorrowers?.coBorrowers?.[0]?.email || null,
      co_borrower_phone: coBorrowers?.coBorrowers?.[0]?.phone || null,
      co_borrower_relationship: coBorrowers?.coBorrowers?.[0]?.relationship || null,
      
      // Declarations
      decl_primary_residence: declarations?.find(d => d.id === 'primary-residence')?.answer ?? null,
      decl_ownership_interest: declarations?.find(d => d.id === 'ownership-interest')?.answer ?? null,
      decl_seller_affiliation: declarations?.find(d => d.id === 'seller-affiliation')?.answer ?? null,
      decl_borrowing_undisclosed: declarations?.find(d => d.id === 'borrowing-undisclosed')?.answer ?? null,
      
      // Demographics - NORMALIZED VALUES
      demographic_ethnicity: demographics?.ethnicity || null,
      demographic_race: demographics?.race || null,
      demographic_gender: normalizedGender,
      
      // Add the default account_id for public submissions
      account_id: '47e707c5-62d0-4ee9-99a3-76572c73a8e1', // Default MortgageBolt account
      
      // Set created_by to Yousif Mohamed (system default for public submissions)
      created_by: '08e73d69-4707-4773-84a4-69ce2acd6a11',
      
      // Set pipeline stage to Screening and mark app complete
      pipeline_stage_id: 'a4e162e0-5421-4d17-8ad5-4b1195bbc995', // Screening stage
      app_complete_at: currentTimestamp,
      new_at: currentTimestamp,
      pending_app_at: currentTimestamp,
      status: 'Working on it',
      lead_on_date: new Date().toISOString().split('T')[0],
      
      // MB Loan Number
      mb_loan_number: mbRefNumber,
    };

    console.log('Prepared lead data:', JSON.stringify(leadData, null, 2));
    console.log('Checking for existing lead by email/phone...');

    // Check for existing lead by email or phone
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, pipeline_stage_id')
      .or(`email.eq.${personalInfo.email},phone.eq.${personalInfo.phone || personalInfo.cellPhone || 'null'}`)
      .in('pipeline_stage_id', [
        '8606cf2a-4fbc-4e0d-81ce-ea7e93d0f2f2', // Leads
        '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945', // Pending App
      ])
      .limit(1);

    let result;

    if (existingLeads && existingLeads.length > 0) {
      console.log('Found existing lead, updating and moving to Screening...');
      // Update existing lead and move to Screening
      const { data, error } = await supabase
        .from('leads')
        .update(leadData)
        .eq('id', existingLeads[0].id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Successfully updated existing lead:', result.id);
    } else {
      console.log('No existing lead found, creating new lead in Screening...');
      // Create new lead in Screening
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select()
        .single();

      if (error) throw error;
      result = data;
      console.log('Successfully created new lead:', result.id);
    }

    // Insert real estate properties if any
    if (realEstate?.properties && realEstate.properties.length > 0) {
      console.log('Inserting real estate properties...');
      const propertyRecords = realEstate.properties.map((property: any) => ({
        lead_id: result.id,
        property_address: property.address || 'Unknown Address',
        property_type: property.propertyType || null,
        property_usage: property.propertyUsage || null,
        property_value: property.propertyValue ? parseCurrency(property.propertyValue) : null,
        monthly_expenses: property.monthlyExpenses ? parseCurrency(property.monthlyExpenses) : null,
        monthly_rent: property.monthlyRent ? parseCurrency(property.monthlyRent) : null,
      }));

      const { error: propertiesError } = await supabase
        .from('real_estate_properties')
        .insert(propertyRecords);

      if (propertiesError) {
        console.error('Error inserting properties:', propertiesError);
        // Don't fail the entire submission if properties fail to insert
      } else {
        console.log(`Successfully inserted ${propertyRecords.length} properties`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: result.id,
        mbRefNumber: mbRefNumber,
        message: 'Application submitted successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error submitting mortgage application:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
