import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SCREENING_STAGE_ID = 'a4e162e0-5421-4d17-8ad5-4b1195bbc995';
const PREQUALIFIED_STAGE_ID = '09162eec-d2b2-48e5-86d0-9e66ee8b2af7';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { confirm = false } = await req.json().catch(() => ({ confirm: false }));

    console.log(`Migration 2 - Mode: ${confirm ? 'APPLY' : 'PREVIEW'}`);

    // Step 1: Get defaults from existing lead
    const { data: existingLead } = await supabase
      .from('leads')
      .select('created_by, account_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const defaults = existingLead || { created_by: null, account_id: null };

    // Step 2: Define buyer agents from Excel data
    const newAgents = [
      { first_name: 'Annie', last_name: 'Lopez', brokerage: 'Unknown' },
      { first_name: 'Russell', last_name: "O'Brien", brokerage: 'Unknown' },
      { first_name: 'Daniel', last_name: 'Hernandez', brokerage: 'Unknown' },
      { first_name: 'Anastasia', last_name: 'Benedeti', brokerage: 'Unknown' },
      { first_name: 'Madison', last_name: 'Clivilles', brokerage: 'Unknown' },
      { first_name: 'Hugo', last_name: 'Barragan', brokerage: 'Unknown' },
      { first_name: 'Yalexis', last_name: '', brokerage: 'Unknown' },
      { first_name: 'Jason', last_name: 'Bishop', brokerage: 'Unknown' },
      { first_name: 'Gian', last_name: 'Peixoto', brokerage: 'Unknown' },
      { first_name: 'Nei', last_name: 'Andreani', brokerage: 'Unknown' },
      { first_name: 'Isabel', last_name: '', brokerage: 'Unknown' },
      { first_name: 'Sandra', last_name: '', brokerage: 'Unknown' },
      { first_name: 'Teresa', last_name: 'Garcia', brokerage: 'Unknown' },
      { first_name: 'Juan Carlos', last_name: 'Perez', brokerage: 'Unknown' },
      { first_name: 'Evan', last_name: 'Schechtman', brokerage: 'Unknown' }
    ];

    // Check which agents already exist
    const { data: existingAgents } = await supabase
      .from('buyer_agents')
      .select('first_name, last_name, id')
      .or(newAgents.map(a => `and(first_name.eq.${a.first_name},last_name.eq.${a.last_name})`).join(','));

    const existingAgentSet = new Set((existingAgents || []).map(a => `${a.first_name}|${a.last_name}`));
    const agentsToInsert = newAgents.filter(a => !existingAgentSet.has(`${a.first_name}|${a.last_name}`));

    // Step 3: Count current leads to delete
    const { count: screeningCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('pipeline_stage_id', SCREENING_STAGE_ID);

    const { count: prequalifiedCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('pipeline_stage_id', PREQUALIFIED_STAGE_ID);

    // Define 3 Screening leads from Excel
    const screeningLeads = [
      {
        first_name: 'Saravanan', last_name: 'Nachimuthiah',
        lead_on_date: '2025-10-29', pending_app_at: '2025-10-29T00:00:00Z', app_complete_at: '2025-10-29T00:00:00Z',
        arrive_loan_number: '15367791', email: 'saran.nachi@gmail.com', phone: '+1 940 390 4534',
        task_eta: '2025-11-04', agent_name: null,
        status: 'JUST APPLIED', pr_type: 'R', loan_amount: 320500, ltv: 78.171, term: 360,
        property_type: 'SingleFamily', occupancy: 'Investment', subject_address_1: '14596 West Sand Hills Road',
        subject_city: 'Sun City West', subject_state: 'AZ', subject_zip: '85387',
        borrower_current_address: '2233 Sullenberger Way', total_monthly_income: 16666.66, dti: '0%',
        program: 'Conventional', escrows: 'None Waived'
      },
      {
        first_name: 'Cullen', last_name: '1MM REFI',
        lead_on_date: '2025-10-03', pending_app_at: '2025-11-05T00:00:00Z', app_complete_at: '2025-11-07T00:00:00Z',
        arrive_loan_number: '15222124', email: 'cullen@soduscapital.com', phone: '+1 305 849 3959',
        task_eta: '2025-11-07', agent_name: null,
        status: 'SCREENING', pr_type: 'R', reo: 'YES', loan_amount: 960000, ltv: 71.111,
        interest_rate: 6.625, term: 360, piti: 9304.13, property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        subject_address_1: '377 22ND AVE SE', subject_city: 'St. Petersburg', subject_state: 'FL', subject_zip: '337053703',
        borrower_current_address: '377 22nd Avenue SE', total_monthly_income: 4000000, dti: '0.23%',
        program: 'Conventional', estimated_fico: '740-779', escrows: 'All Waived'
      },
      {
        first_name: 'Mohamed', last_name: 'Rasmy',
        lead_on_date: '2025-11-04', pending_app_at: '2025-11-10T00:00:00Z', app_complete_at: '2025-11-10T00:00:00Z',
        arrive_loan_number: null, email: null, phone: null,
        task_eta: '2025-11-10', agent_name: null,
        status: 'JUST APPLIED', pr_type: 'HELOC', income_type: 'SALARY', reo: 'YES',
        property_type: 'SFR', occupancy: 'Primary Residence', program: 'CONVENTONAL', estimated_fico: '780+'
      }
    ];

    // Define 18 Pre-Qualified leads with comprehensive data from Excel
    const prequalifiedLeads = [
      {
        first_name: 'Lucja', last_name: 'Baldwin',
        lead_on_date: '2025-07-03', pending_app_at: null, app_complete_at: '2025-07-12T00:00:00Z', pre_qualified_at: '2025-07-18T00:00:00Z',
        arrive_loan_number: '14621107', loan_amount: 800000, sales_price: 1000000, down_pmt: 200000, ltv: 80,
        monthly_pmt_goal: 3000, program: 'CONVENTONAL', property_type: 'CONDO', occupancy: 'Second Home',
        pr_type: 'P', income_type: 'NON QM', reo: 'YES', estimated_fico: '740-779', escrows: 'NONE WAIVED',
        task_eta: '2025-10-21', agent_name: 'Annie Lopez', phone: '+1 786 527 5137', email: 'krzak.lucja@gmail.com',
        subject_city: 'Miami', subject_state: 'FL', term: 360, total_monthly_income: 12000, dob: '1989-08-05',
        borrower_current_address: '17 Drifting Shadow Way Las Vegas NV 89135', dti: '0.00%'
      },
      {
        first_name: 'Darwin', last_name: 'Justiniano',
        lead_on_date: '2025-07-07', pending_app_at: null, app_complete_at: '2025-07-08T00:00:00Z', pre_qualified_at: '2025-07-22T00:00:00Z',
        arrive_loan_number: '14621467', loan_amount: 297000, sales_price: 307000, down_pmt: 10000, ltv: 96.743,
        monthly_pmt_goal: 2500, program: 'CONVENTONAL', property_type: 'CONDO', occupancy: 'Primary Residence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '620-659', escrows: 'NONE WAIVED',
        task_eta: '2025-10-21', agent_name: "Russell O'Brien", phone: '+1 305 790 9586', email: 'josedarw@hotmail.com',
        subject_city: 'Miami Beach', subject_state: 'FL', subject_zip: '33139', term: 360, total_monthly_income: 6000,
        dob: '1981-03-25', borrower_current_address: '401 Ocean Drive Apt 922 Miami Beach FL 33139', dti: '0.00%'
      },
      {
        first_name: 'Arife', last_name: 'Colak',
        lead_on_date: '2025-07-21', pending_app_at: null, app_complete_at: '2025-07-22T00:00:00Z', pre_qualified_at: '2025-07-30T00:00:00Z',
        arrive_loan_number: '14706043', loan_amount: 240000, sales_price: 360000, down_pmt: 120000, ltv: 66.667,
        monthly_pmt_goal: 0, program: 'CONVENTONAL', property_type: 'SFR', occupancy: 'Primary Residence',
        pr_type: 'P', income_type: 'S/E', reo: 'YES', estimated_fico: '580-619', escrows: 'NONE WAIVED',
        task_eta: null, agent_name: 'Daniel Hernandez', phone: '+1 214 836 0275', email: 'nextplazausa@gmail.com',
        subject_city: 'Little Haiti', subject_state: 'FL', term: 360, total_monthly_income: 10000,
        dob: '1989-05-05', borrower_current_address: 'Oviedo 29 # 1, Coral Gables, FL 33134, USA', dti: '0.00%'
      },
      {
        first_name: 'Wesley', last_name: 'Magalhaes Rangel',
        lead_on_date: '2025-06-12', pending_app_at: null, app_complete_at: '2025-06-30T00:00:00Z', pre_qualified_at: '2025-07-31T00:00:00Z',
        arrive_loan_number: '14581137', loan_amount: 715000, sales_price: 750000, down_pmt: 35000, ltv: 95.333,
        monthly_pmt_goal: 0, program: 'CONVENTONAL', property_type: 'SFR', occupancy: 'Primary Residence',
        pr_type: 'P', income_type: null, reo: null, estimated_fico: '660-699', escrows: 'NONE WAIVED',
        task_eta: '2025-10-21', agent_name: 'Anastasia Benedeti', phone: '+1 786 208 3057', email: 'wesleyrangel@gmail.com',
        subject_city: 'Doral', subject_state: 'FL', subject_zip: '33178', term: 360, total_monthly_income: 0,
        dob: '1985-11-11', borrower_current_address: '7930 Northwest 108th Place DoralFL 33178'
      },
      {
        first_name: 'Jeffrey', last_name: 'Newsome',
        lead_on_date: '2025-07-25', pending_app_at: null, app_complete_at: '2025-07-28T00:00:00Z', pre_qualified_at: '2025-08-04T00:00:00Z',
        arrive_loan_number: '14739586', loan_amount: 840000, sales_price: 1050000, down_pmt: 210000, ltv: 80,
        monthly_pmt_goal: 6500, program: 'CONVENTONAL', property_type: 'SFR', occupancy: 'Primary Residence',
        pr_type: 'P', income_type: 'SALARY', reo: 'YES', estimated_fico: '700-739', escrows: 'NONE WAIVED',
        task_eta: '2025-11-21', agent_name: null, phone: '+1 727 348 8635', email: 'jnewsome94@yahoo.com',
        interest_rate: 6.99, subject_city: 'St. Petersburg', subject_state: 'FL', subject_zip: '33702', term: 360,
        total_monthly_income: 19949.99, monthly_liabilities: 1000, dob: '1994-07-02',
        borrower_current_address: '7675 8th Street North St. Petersburg FL 33702', dti: '5.01%'
      },
      {
        first_name: 'Diego', last_name: 'Herrera',
        lead_on_date: '2025-08-08', pending_app_at: '2025-08-08T00:00:00Z', app_complete_at: '2025-08-10T00:00:00Z', pre_qualified_at: '2025-08-19T00:00:00Z',
        arrive_loan_number: '14818806', loan_amount: 950000, sales_price: 1000000, down_pmt: 50000, ltv: 95,
        monthly_pmt_goal: null, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '780+', escrows: 'None Waived',
        task_eta: '2025-10-21', agent_name: 'Anastasia Benedeti', phone: '+1 720 325 8541', email: 'diego.herrera93@gmail.com',
        subject_city: 'Miami', subject_state: 'FL', term: 360, total_monthly_income: 14583.33,
        dob: '1993-07-23', borrower_current_address: '1865 Brickell Avenue', dti: '0.00%'
      },
      {
        first_name: 'Wafaa', last_name: '',
        lead_on_date: '2025-08-27', pending_app_at: '2025-09-03T00:00:00Z', app_complete_at: '2025-09-04T00:00:00Z', pre_qualified_at: '2025-09-08T00:00:00Z',
        arrive_loan_number: '14964002', loan_amount: 250000, sales_price: 500000, down_pmt: 50, ltv: 50,
        monthly_pmt_goal: 2500, program: 'CONVENTONAL', property_type: 'Condominium', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '700-739', escrows: 'None',
        task_eta: '2026-01-01', agent_name: 'Madison Clivilles', phone: null, email: null,
        interest_rate: 7.125, term: 360, piti: 2415, total_monthly_income: 8235, monthly_liabilities: 530,
        estimated_fico: '700', dti: '35.76%'
      },
      {
        first_name: 'Catalina', last_name: 'Delgado',
        lead_on_date: '2025-09-18', pending_app_at: '2025-09-19T00:00:00Z', app_complete_at: '2025-09-18T00:00:00Z', pre_qualified_at: '2025-09-26T00:00:00Z',
        arrive_loan_number: '15103665', loan_amount: 428000, sales_price: 535000, down_pmt: 107600, ltv: 80,
        monthly_pmt_goal: 2500, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: null, reo: null, estimated_fico: null, escrows: 'None Waived',
        task_eta: '2025-11-04', agent_name: 'Hugo Barragan', phone: '+1 305 417 0824', email: 'catalinadelgador@gmail.com',
        interest_rate: 5.99, subject_city: 'Miami', subject_state: 'FL', subject_zip: '33129', term: 360, piti: 3629,
        total_monthly_income: 10946.67813, monthly_liabilities: 2300,
        borrower_current_address: '2150 Southwest 16th Avenue', dti: '54.16%'
      },
      {
        first_name: 'Leyter', last_name: 'Fernandez',
        lead_on_date: '2025-10-03', pending_app_at: '2025-10-03T00:00:00Z', app_complete_at: '2025-10-03T00:00:00Z', pre_qualified_at: '2025-10-08T00:00:00Z',
        arrive_loan_number: '15195985', loan_amount: 525000, sales_price: 700000, down_pmt: 175000, ltv: 75,
        monthly_pmt_goal: 3200, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'S/E', reo: 'YES', estimated_fico: '740-779', escrows: 'ALL WAIVED',
        task_eta: '2025-10-29', agent_name: 'Yalexis', phone: '+1 786 554 6667', email: 'lorenzos12125@hotmail.com',
        interest_rate: 6.375, subject_city: 'Palmetto Bay', subject_state: 'FL', subject_zip: '33157', term: 360,
        piti: 3275.32, total_monthly_income: 44683, borrower_current_address: '665 Northeast 25th Street',
        estimated_fico: '665', dti: '7.33%'
      },
      {
        first_name: 'Jacob', last_name: 'Rico',
        lead_on_date: '2025-10-09', pending_app_at: '2025-10-09T00:00:00Z', app_complete_at: '2025-10-09T00:00:00Z', pre_qualified_at: '2025-10-10T00:00:00Z',
        arrive_loan_number: '15237910', loan_amount: 280000, sales_price: 300000, down_pmt: 20000, ltv: 93.333,
        monthly_pmt_goal: 2800, program: 'Conventional', property_type: 'CONDO', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'SALARY', reo: 'YES', estimated_fico: '780+', escrows: 'None Waived',
        task_eta: '2025-10-20', agent_name: 'Jason Bishop', phone: '+1 620 260 0366', email: 'jacobprico@gmail.com',
        interest_rate: 6.375, subject_city: 'Miami', subject_state: 'FL', subject_zip: '33133', term: 360,
        piti: 3259.34, total_monthly_income: 10100, monthly_liabilities: 500,
        borrower_current_address: '2700 Southwest 27th Avenue', dti: '37.22%'
      },
      {
        first_name: 'angelo', last_name: 'gian',
        lead_on_date: '2025-10-20', pending_app_at: '2025-10-22T00:00:00Z', app_complete_at: '2025-10-22T00:00:00Z', pre_qualified_at: '2025-10-22T00:00:00Z',
        arrive_loan_number: '15307118', loan_amount: 495000, sales_price: 550000, down_pmt: 55000, ltv: 90,
        monthly_pmt_goal: 3500, program: 'CONVENTONAL', property_type: 'SFR', occupancy: 'Primary Residence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '780+', escrows: 'ALL WAIVED',
        task_eta: '2025-11-10', agent_name: 'Gian Peixoto', phone: null, email: null,
        interest_rate: 5.99, term: 360, piti: 4081, total_monthly_income: 10833, monthly_liabilities: 500,
        estimated_fico: '780', dti: '42.29%'
      },
      {
        first_name: 'Caio', last_name: 'Quadrado',
        lead_on_date: '2025-02-06', pending_app_at: '2025-04-08T00:00:00Z', app_complete_at: '2025-10-20T00:00:00Z', pre_qualified_at: '2025-10-23T00:00:00Z',
        arrive_loan_number: '15301937', loan_amount: 0, sales_price: null, down_pmt: 0, ltv: 0,
        monthly_pmt_goal: null, program: 'NON-QM', property_type: 'SingleFamily', occupancy: 'Investment',
        pr_type: 'R', income_type: 'DSCR', reo: 'YES', estimated_fico: null, escrows: 'None Waived',
        task_eta: '2025-11-07', agent_name: 'Nei Andreani', phone: '+1 954 805 3436', email: 'caiorq@gmail.com',
        subject_address_1: '2493 Poinciana Drive', subject_city: 'Weston', subject_state: 'FL', subject_zip: '333271414',
        term: 360, borrower_current_address: '1 Franklin Street'
      },
      {
        first_name: 'Sergio', last_name: 'Otero',
        lead_on_date: '2025-10-22', pending_app_at: '2025-10-23T00:00:00Z', app_complete_at: '2025-10-23T00:00:00Z', pre_qualified_at: '2025-10-29T00:00:00Z',
        arrive_loan_number: '15323778', loan_amount: 262500, sales_price: 350000, down_pmt: 60000, ltv: 75,
        monthly_pmt_goal: null, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'Investment',
        pr_type: 'P', income_type: null, reo: null, estimated_fico: null, escrows: 'None Waived',
        task_eta: '2025-11-24', agent_name: 'Isabel', phone: '+1 786 616 7039', email: 'se_otero@yahoo.es',
        interest_rate: 8.125, subject_city: 'Miami', subject_state: 'FL', subject_zip: '33131', term: 360,
        piti: 1975.51, total_monthly_income: 16250, monthly_liabilities: 618,
        borrower_current_address: '1111 N Milwaukee Ave', dti: '15.96%'
      },
      {
        first_name: 'Gustavo', last_name: 'Mariela',
        lead_on_date: '2025-10-28', pending_app_at: '2025-10-28T00:00:00Z', app_complete_at: '2025-10-28T00:00:00Z', pre_qualified_at: '2025-10-30T00:00:00Z',
        arrive_loan_number: '15360789', loan_amount: 624000, sales_price: 780000, down_pmt: 156000, ltv: 80,
        monthly_pmt_goal: 3000, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'Investment',
        pr_type: 'P', income_type: 'SALARY', reo: null, estimated_fico: null, escrows: 'None Waived',
        task_eta: '2025-11-14', agent_name: 'Sandra', phone: '+1 305 469 7012', email: 'mkbullor@hotmail.com',
        subject_address_1: '1901 Miami Road', subject_city: 'Fort Lauderdale', subject_state: 'FL', subject_zip: '333163561',
        term: 360, total_monthly_income: 33666.6745, borrower_current_address: '4485 Ficus Street', dti: '0.00%'
      },
      {
        first_name: 'Ashley', last_name: 'Soto',
        lead_on_date: '2025-10-20', pending_app_at: '2025-10-30T00:00:00Z', app_complete_at: '2025-10-30T00:00:00Z', pre_qualified_at: '2025-10-31T00:00:00Z',
        arrive_loan_number: '15375404', loan_amount: 315000, sales_price: 350000, down_pmt: 35000, ltv: 90,
        monthly_pmt_goal: 2900, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '780+', escrows: 'None Waived',
        task_eta: '2025-11-10', agent_name: 'Teresa Garcia', phone: '+1 954 284 3100', email: 'acsoto93@gmail.com',
        interest_rate: 5.625, subject_city: 'Pembroke Pines', subject_state: 'FL', subject_zip: '33025', term: 360,
        piti: 2710, total_monthly_income: 7785.42, monthly_liabilities: 500, estimated_fico: '780',
        borrower_current_address: '911 Southwest 111th Avenue', dti: '41.23%'
      },
      {
        first_name: 'Ryan', last_name: 'Rached',
        lead_on_date: '2025-10-27', pending_app_at: '2025-10-28T00:00:00Z', app_complete_at: '2025-10-29T00:00:00Z', pre_qualified_at: '2025-11-03T00:00:00Z',
        arrive_loan_number: '15362307', loan_amount: 420000, sales_price: 600000, down_pmt: 150000, ltv: 70,
        monthly_pmt_goal: null, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'NON QM', reo: 'NO', estimated_fico: '740-779', escrows: 'None Waived',
        task_eta: '2025-11-10', agent_name: 'Juan Carlos Perez', phone: '+1 786 657 0455', email: 'ryanrached@gmail.com',
        subject_city: 'Miami', subject_state: 'FL', subject_zip: '33130', term: 360, total_monthly_income: 1240,
        monthly_liabilities: 766, borrower_current_address: '325 South Dixie Highway', dti: '61.77%'
      },
      {
        first_name: 'Jason', last_name: 'Herald',
        lead_on_date: '2025-11-06', pending_app_at: '2025-11-07T00:00:00Z', app_complete_at: '2025-11-06T00:00:00Z', pre_qualified_at: '2025-11-07T00:00:00Z',
        arrive_loan_number: '15417922', loan_amount: 387500, sales_price: 500000, down_pmt: 112500, ltv: 77.5,
        monthly_pmt_goal: null, program: 'Conventional', property_type: 'Condominium', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '780+', escrows: 'None Waived',
        task_eta: '2025-11-10', agent_name: 'Evan Schechtman', phone: '+1 984 303 8175', email: 'thejasonjerald@gmail.com',
        subject_city: 'Miami', subject_state: 'FL', term: 360, total_monthly_income: 12765.8,
        borrower_current_address: '230 Northeast 4th Street', dti: '0.00%'
      },
      {
        first_name: 'Karina', last_name: 'Perera',
        lead_on_date: '2025-11-06', pending_app_at: '2025-11-06T00:00:00Z', app_complete_at: '2025-11-06T00:00:00Z', pre_qualified_at: '2025-11-10T00:00:00Z',
        arrive_loan_number: '15420274', loan_amount: 306700, sales_price: 600000, down_pmt: 76675, ltv: 75,
        monthly_pmt_goal: 1500, program: 'Conventional', property_type: 'SingleFamily', occupancy: 'PrimaryResidence',
        pr_type: 'P', income_type: 'SALARY', reo: 'NO', estimated_fico: '700-739', escrows: 'ALL WAIVED',
        task_eta: '2025-11-07', agent_name: null, phone: '+1 305 205 8382', email: 'karina_perera@yahoo.com',
        interest_rate: 6.125, subject_address_1: '551 West 79th Street', subject_city: 'Hialeah', subject_state: 'FL',
        subject_zip: '330144224', term: 360, piti: 2075, total_monthly_income: 7750, monthly_liabilities: 800,
        estimated_fico: '708', borrower_current_address: '551 West 79th Street', dti: '37.10%'
      }
    ];

    // Get agent IDs for lookups
    const allAgentNames = [...new Set([...screeningLeads, ...prequalifiedLeads].map(l => l.agent_name).filter(Boolean))];
    const { data: agentLookup } = await supabase
      .from('buyer_agents')
      .select('first_name, last_name, id')
      .or(allAgentNames.map(name => {
        const [first, last] = name!.split(' ');
        return `and(first_name.eq.${first},last_name.eq.${last})`;
      }).join(','));

    const agentMap = new Map((agentLookup || []).map(a => [`${a.first_name} ${a.last_name}`, a.id]));

    // PREVIEW MODE
    if (!confirm) {
      return new Response(JSON.stringify({
        mode: 'PREVIEW',
        summary: {
          leads_to_delete: {
            screening: screeningCount || 0,
            pre_qualified: prequalifiedCount || 0,
            total: (screeningCount || 0) + (prequalifiedCount || 0)
          },
          buyer_agents: {
            already_exist: existingAgents?.length || 0,
            to_insert: agentsToInsert.length,
            total_needed: newAgents.length
          },
          leads_to_insert: {
            screening: screeningLeads.length,
            pre_qualified: prequalifiedLeads.length,
            total: screeningLeads.length + prequalifiedLeads.length
          }
        },
        agents_to_insert: agentsToInsert,
        note: 'Send { "confirm": true } to execute this migration'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // APPLY MODE
    console.log('Starting migration execution...');

    // Delete tasks for both stages
    const leadIds = await supabase
      .from('leads')
      .select('id')
      .in('pipeline_stage_id', [SCREENING_STAGE_ID, PREQUALIFIED_STAGE_ID]);

    if (leadIds.data && leadIds.data.length > 0) {
      const { error: deleteTasksError } = await supabase
        .from('tasks')
        .delete()
        .in('borrower_id', leadIds.data.map(l => l.id));
      
      if (deleteTasksError) throw deleteTasksError;
      console.log('Deleted tasks');
    }

    // Delete leads in both stages
    const { error: deleteLeadsError } = await supabase
      .from('leads')
      .delete()
      .in('pipeline_stage_id', [SCREENING_STAGE_ID, PREQUALIFIED_STAGE_ID]);
    
    if (deleteLeadsError) throw deleteLeadsError;
    console.log('Deleted old leads');

    // Insert missing buyer agents
    if (agentsToInsert.length > 0) {
      const { data: insertedAgents, error: insertAgentsError } = await supabase
        .from('buyer_agents')
        .insert(agentsToInsert)
        .select('first_name, last_name, id');
      
      if (insertAgentsError) throw insertAgentsError;
      console.log(`Inserted ${insertedAgents?.length || 0} new buyer agents`);

      // Update agentMap with newly inserted agents
      insertedAgents?.forEach(a => agentMap.set(`${a.first_name} ${a.last_name}`, a.id));
    }

    // Insert Screening leads
    const screeningInserts = screeningLeads.map(lead => ({
      first_name: lead.first_name,
      last_name: lead.last_name,
      lead_on_date: lead.lead_on_date,
      pending_app_at: lead.pending_app_at,
      app_complete_at: lead.app_complete_at,
      arrive_loan_number: lead.arrive_loan_number,
      email: lead.email,
      phone: lead.phone,
      task_eta: lead.task_eta,
      buyer_agent_id: lead.agent_name ? agentMap.get(lead.agent_name) : null,
      pipeline_stage_id: SCREENING_STAGE_ID,
      account_id: defaults.account_id,
      created_by: defaults.created_by
    }));

    const { error: insertScreeningError } = await supabase
      .from('leads')
      .insert(screeningInserts);
    
    if (insertScreeningError) throw insertScreeningError;
    console.log(`Inserted ${screeningLeads.length} Screening leads`);

    // Insert Pre-Qualified leads
    const prequalifiedInserts = prequalifiedLeads.map(lead => ({
      first_name: lead.first_name,
      last_name: lead.last_name,
      lead_on_date: lead.lead_on_date,
      pending_app_at: lead.pending_app_at,
      app_complete_at: lead.app_complete_at,
      pre_qualified_at: lead.pre_qualified_at,
      arrive_loan_number: lead.arrive_loan_number,
      loan_amount: lead.loan_amount,
      sales_price: lead.sales_price,
      down_pmt: lead.down_pmt,
      interest_rate: lead.interest_rate,
      monthly_pmt_goal: lead.monthly_pmt_goal,
      program: lead.program,
      property_type: lead.property_type,
      occupancy: lead.occupancy,
      pr_type: lead.pr_type,
      income_type: lead.income_type,
      reo: lead.reo,
      task_eta: lead.task_eta,
      buyer_agent_id: lead.agent_name ? agentMap.get(lead.agent_name) : null,
      pipeline_stage_id: PREQUALIFIED_STAGE_ID,
      account_id: defaults.account_id,
      created_by: defaults.created_by
    }));

    const { error: insertPrequalifiedError } = await supabase
      .from('leads')
      .insert(prequalifiedInserts);
    
    if (insertPrequalifiedError) throw insertPrequalifiedError;
    console.log(`Inserted ${prequalifiedLeads.length} Pre-Qualified leads`);

    return new Response(JSON.stringify({
      mode: 'APPLIED',
      success: true,
      results: {
        deleted_leads: (screeningCount || 0) + (prequalifiedCount || 0),
        inserted_agents: agentsToInsert.length,
        inserted_screening_leads: screeningLeads.length,
        inserted_prequalified_leads: prequalifiedLeads.length
      },
      message: 'Migration 2 completed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
