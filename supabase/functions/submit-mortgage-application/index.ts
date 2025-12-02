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
    location?: {
      city?: string;
      state?: string;
      zipCode?: string;
      countyName?: string;
    };
  };
  personalInfo: {
    firstName: string;
    lastName: string;
    middleName?: string;
    phone?: string;
    email: string;
    dateOfBirth?: string;
    estimatedCreditScore?: string;
    maritalStatus?: string;
    residencyType?: string;
    currentAddress?: {
      street?: string;
      unit?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    yearsAtCurrentAddress?: string;
    monthsAtCurrentAddress?: string;
    ownOrRent?: string;
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

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { personalInfo, mortgageInfo, coBorrowers, income, assets, realEstate, declarations, demographics } = applicationData;

    // Calculate total monthly income
    const totalMonthlyIncome = (income?.employmentIncomes || []).reduce((sum: number, emp: any) => {
      const monthlyIncome = parseFloat((emp.monthlyIncome || '0').replace(/,/g, ''));
      return sum + monthlyIncome;
    }, 0) + (income?.otherIncomes || []).reduce((sum: number, inc: any) => {
      const amount = parseFloat((inc.amount || '0').replace(/,/g, ''));
      return sum + amount;
    }, 0);

    // Calculate total assets
    const totalAssets = (assets?.assets || []).reduce((sum: number, asset: any) => {
      const balance = parseFloat((asset.balance || '0').replace(/,/g, ''));
      return sum + balance;
    }, 0);

    // Calculate monthly liabilities from real estate
    const monthlyLiabilities = (realEstate?.properties || []).reduce((sum: number, property: any) => {
      const expenses = parseFloat((property.monthlyExpenses || '0').replace(/,/g, ''));
      return sum + expenses;
    }, 0);

    // Map credit score range to numeric value
    const creditScoreMap: Record<string, number> = {
      '740-plus': 760,
      '700-739': 720,
      '660-699': 680,
      '620-660': 640,
      'below-620': 580,
    };

    // Map residency type to include "Foreign National"
    const residencyTypeMap: Record<string, string> = {
      'us-citizen': 'US Citizen',
      'permanent-resident': 'Permanent Resident',
      'non-permanent-resident': 'Non-Permanent Resident',
      'foreign-national': 'Foreign National',
    };

    // Calculate Principal & Interest (P&I) using standard amortization formula
    const salesPrice = mortgageInfo.purchasePrice ? parseFloat(mortgageInfo.purchasePrice.replace(/,/g, '')) : 0;
    const downPayment = mortgageInfo.downPaymentAmount ? parseFloat(mortgageInfo.downPaymentAmount.replace(/,/g, '')) : 0;
    const loanAmount = salesPrice - downPayment;
    const interestRate = 7.0; // 7% default
    const termMonths = 360; // 30 years default
    const monthlyRate = interestRate / 100 / 12;
    const principalInterest = loanAmount > 0 
      ? Math.round(loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1))
      : 0;
    
    // Default property taxes: 1% of purchase price / 12
    const propertyTaxes = salesPrice > 0 ? Math.round(salesPrice * 0.01 / 12) : 0;

    // Generate MB reference number
    const mbRefNumber = `MB-${Date.now().toString().slice(-8)}`;
    const currentTimestamp = new Date().toISOString();

    // Prepare lead data
    const leadData = {
      first_name: personalInfo.firstName,
      last_name: personalInfo.lastName,
      middle_name: personalInfo.middleName || null,
      phone: personalInfo.cellPhone || null,
      email: personalInfo.email,
      dob: personalInfo.dateOfBirth || null,
      fico_score: personalInfo.estimatedCreditScore ? creditScoreMap[personalInfo.estimatedCreditScore] || null : null,
      marital_status: personalInfo.maritalStatus || null,
      residency_type: personalInfo.residencyType ? (residencyTypeMap[personalInfo.residencyType] || personalInfo.residencyType) : null,
      borrower_current_address: personalInfo.currentAddress ? 
        [personalInfo.currentAddress.street, personalInfo.currentAddress.unit, personalInfo.currentAddress.city, personalInfo.currentAddress.state, personalInfo.currentAddress.zipCode]
          .filter(Boolean).join(', ') : null,
      time_at_current_address_years: personalInfo.yearsAtCurrentAddress ? parseInt(personalInfo.yearsAtCurrentAddress) : null,
      time_at_current_address_months: personalInfo.monthsAtCurrentAddress ? parseInt(personalInfo.monthsAtCurrentAddress) : null,
      own_rent_current_address: personalInfo.ownOrRent || null,
      military_veteran: personalInfo.militaryVeteran || false,
      
      loan_type: applicationData.loanPurpose || null,
      property_type: mortgageInfo.propertyType || null,
      occupancy: mortgageInfo.occupancy || null,
      sales_price: salesPrice || null,
      loan_amount: loanAmount || null,
      down_pmt: downPayment || null,
      monthly_pmt_goal: mortgageInfo.comfortableMonthlyPayment ? parseFloat(mortgageInfo.comfortableMonthlyPayment.replace(/,/g, '')) : null,
      
      // Auto-calculated fields
      principal_interest: principalInterest,
      homeowners_insurance: 100, // Default $100/month
      property_taxes: propertyTaxes,
      interest_rate: interestRate,
      term: termMonths,
      
      // Subject property address
      subject_address_1: 'TBD',
      subject_address_2: null,
      subject_city: mortgageInfo.location?.city || null,
      subject_state: mortgageInfo.location?.state || null,
      subject_zip: mortgageInfo.location?.zipCode || null,
      
      total_monthly_income: totalMonthlyIncome > 0 ? totalMonthlyIncome : null,
      assets: totalAssets > 0 ? totalAssets : null,
      monthly_liabilities: monthlyLiabilities > 0 ? monthlyLiabilities : null,
      
      // Co-borrower information
      co_borrower_first_name: coBorrowers?.coBorrowers?.[0]?.firstName || null,
      co_borrower_last_name: coBorrowers?.coBorrowers?.[0]?.lastName || null,
      co_borrower_email: coBorrowers?.coBorrowers?.[0]?.email || null,
      co_borrower_phone: coBorrowers?.coBorrowers?.[0]?.phone || null,
      co_borrower_relationship: coBorrowers?.coBorrowers?.[0]?.relationship || null,
      
      // Declarations
      decl_primary_residence: declarations.find(d => d.id === 'primary-residence')?.answer ?? null,
      decl_ownership_interest: declarations.find(d => d.id === 'ownership-interest')?.answer ?? null,
      decl_seller_affiliation: declarations.find(d => d.id === 'seller-affiliation')?.answer ?? null,
      decl_borrowing_undisclosed: declarations.find(d => d.id === 'borrowing-undisclosed')?.answer ?? null,
      
      // Demographics
      demographic_ethnicity: demographics?.ethnicity || null,
      demographic_race: demographics?.race || null,
      demographic_gender: demographics?.gender || null,
      
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

    console.log('Checking for existing lead by email/phone...');

    // Check for existing lead by email or phone
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id, pipeline_stage_id')
      .or(`email.eq.${personalInfo.email},phone.eq.${personalInfo.phone || 'null'}`)
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
        property_value: property.propertyValue ? parseFloat(property.propertyValue) : null,
        monthly_expenses: property.monthlyExpenses ? parseFloat(property.monthlyExpenses) : null,
        monthly_rent: property.monthlyRent ? parseFloat(property.monthlyRent) : null,
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
