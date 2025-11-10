import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BuyerAgent {
  first_name: string;
  last_name: string;
  brokerage: string;
}

interface Lender {
  lender_name: string;
}

// Helper to parse dates
function parseDate(val: any): string | null {
  if (!val || val === '') return null;
  if (typeof val === 'string') {
    // Handle "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DD"
    const dateOnly = val.split(' ')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return dateOnly;
  }
  return null;
}

// Helper to convert string booleans
function toBool(val: any): boolean | null {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).toUpperCase();
  if (str === 'YES' || str === 'TRUE' || str === '1') return true;
  if (str === 'NO' || str === 'FALSE' || str === '0') return false;
  return null;
}

// Helper to parse FICO (handle ranges like "700-739")
function parseFico(val: any): number | null {
  if (!val || val === '') return null;
  const str = String(val).trim();
  if (str.includes('-')) {
    const parts = str.split('-');
    const min = parseInt(parts[0], 10);
    return isNaN(min) ? null : min;
  }
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

// Helper to parse decimal numbers
function parseDecimal(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val).replace(/[^0-9.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { confirm } = await req.json();
    const mode = confirm ? 'APPLY' : 'PREVIEW';

    console.log(`[migrate-active] Running in ${mode} mode`);

    // Step 1: Use Active pipeline stage ID (hardcoded)
    const activePipelineStageId = '76eb2e82-e1d9-4f2d-a57d-2120a25696db';
    console.log(`[migrate-active] Active stage ID: ${activePipelineStageId}`);

    // Step 2: Query existing Active leads
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('pipeline_stage_id', activePipelineStageId);

    const existingLeadIds = existingLeads?.map((l: any) => l.id) || [];
    console.log(`[migrate-active] Found ${existingLeadIds.length} existing Active leads to delete`);

    // Step 3: Delete existing data (in correct order)
    let deletedBorrowers = 0;
    let deletedTasks = 0;
    let deletedLeads = 0;

    if (confirm && existingLeadIds.length > 0) {
      // Delete borrowers first
      const { error: borrowersError } = await supabase
        .from('borrowers')
        .delete()
        .in('lead_id', existingLeadIds);

      if (borrowersError) {
        console.error('[migrate-active] Error deleting borrowers:', borrowersError);
      } else {
        deletedBorrowers = existingLeadIds.length;
        console.log(`[migrate-active] Deleted ${deletedBorrowers} borrower records`);
      }

      // Delete tasks
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .in('borrower_id', existingLeadIds);

      if (tasksError) {
        console.error('[migrate-active] Error deleting tasks:', tasksError);
      } else {
        deletedTasks = existingLeadIds.length;
        console.log(`[migrate-active] Deleted ${deletedTasks} task records`);
      }

      // Delete leads
      const { error: leadsError } = await supabase
        .from('leads')
        .delete()
        .in('id', existingLeadIds);

      if (leadsError) {
        throw new Error(`Failed to delete leads: ${leadsError.message}`);
      }
      deletedLeads = existingLeadIds.length;
      console.log(`[migrate-active] Deleted ${deletedLeads} Active leads`);
    }

    // Step 4: Get existing buyer agents
    const { data: existingAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name');

    const existingAgentMap = new Map<string, string>();
    existingAgents?.forEach((a: any) => {
      const key = `${a.first_name} ${a.last_name}`.toLowerCase();
      existingAgentMap.set(key, a.id);
    });

    // Step 5: Get existing lenders
    const { data: existingLenders } = await supabase
      .from('lenders')
      .select('id, lender_name');

    const existingLenderMap = new Map<string, string>();
    existingLenders?.forEach((l: any) => {
      existingLenderMap.set(l.lender_name.toLowerCase(), l.id);
    });

    // Step 6: Define new buyer agents to create
    const newAgents: BuyerAgent[] = [
      { first_name: 'Silvy', last_name: 'Souza', brokerage: 'Unknown Brokerage' },
      { first_name: 'Tatiana', last_name: 'Rodriguez', brokerage: 'Unknown Brokerage' },
      { first_name: 'Jackeline', last_name: 'Londono', brokerage: 'Unknown Brokerage' },
      { first_name: 'Andre', last_name: 'Martins', brokerage: 'Unknown Brokerage' },
      { first_name: 'Karen', last_name: 'Elmir', brokerage: 'Unknown Brokerage' },
      { first_name: 'Khloe', last_name: 'Guerra', brokerage: 'Unknown Brokerage' },
      { first_name: 'Ramon', last_name: 'Rodriguez', brokerage: 'Unknown Brokerage' },
      { first_name: 'Sarah', last_name: 'Desamours', brokerage: 'Unknown Brokerage' },
      { first_name: 'Joaquin', last_name: 'Leon', brokerage: 'Unknown Brokerage' },
      { first_name: 'Alireza', last_name: 'Naghdian', brokerage: 'Unknown Brokerage' },
      { first_name: 'Patricia', last_name: 'Rapan', brokerage: 'Unknown Brokerage' },
      { first_name: 'Brett', last_name: 'Roy', brokerage: 'Unknown Brokerage' },
    ];

    let createdAgentsCount = 0;

    if (confirm) {
      for (const agent of newAgents) {
        const key = `${agent.first_name} ${agent.last_name}`.toLowerCase();
        if (!existingAgentMap.has(key)) {
          const { data: newAgent, error } = await supabase
            .from('buyer_agents')
            .insert(agent)
            .select('id, first_name, last_name')
            .single();

          if (error) {
            console.error(`[migrate-active] Error creating agent ${agent.first_name} ${agent.last_name}:`, error);
          } else if (newAgent) {
            existingAgentMap.set(key, newAgent.id);
            createdAgentsCount++;
            console.log(`[migrate-active] Created buyer agent: ${agent.first_name} ${agent.last_name}`);
          }
        }
      }
    }

    // Step 7: Define new lenders to create
    const newLenders: Lender[] = [
      { lender_name: 'A&D MORTGAGE LLC' },
      { lender_name: 'Deephaven Mortgage LLC' },
      { lender_name: 'Champions Funding LLC' },
    ];

    let createdLendersCount = 0;

    if (confirm) {
      for (const lender of newLenders) {
        const key = lender.lender_name.toLowerCase();
        if (!existingLenderMap.has(key)) {
          const { data: newLender, error } = await supabase
            .from('lenders')
            .insert(lender)
            .select('id, lender_name')
            .single();

          if (error) {
            console.error(`[migrate-active] Error creating lender ${lender.lender_name}:`, error);
          } else if (newLender) {
            existingLenderMap.set(key, newLender.id);
            createdLendersCount++;
            console.log(`[migrate-active] Created lender: ${lender.lender_name}`);
          }
        }
      }
    }

    // Step 8: Helper to get agent ID
    function getAgentId(firstName: string, lastName: string): string | null {
      if (!firstName || !lastName || firstName === 'REFI' || lastName === 'REFI') return null;
      const key = `${firstName} ${lastName}`.toLowerCase();
      return existingAgentMap.get(key) || null;
    }

    // Step 9: Helper to get lender ID
    function getLenderId(lenderName: string): string | null {
      if (!lenderName) return null;
      const key = lenderName.toLowerCase();
      return existingLenderMap.get(key) || null;
    }

    // Step 10: Define 18 Active leads with comprehensive data
    const activeLeads = [
      {
        first_name: 'Daniel',
        last_name: 'Tejada',
        email: 'dtejada@icloud.com',
        phone: '3055191848',
        dob: parseDate('1993-03-08'),
        ssn: null,
        borrower_current_address: '2775 NE 187 St #302, Aventura FL 33180',
        lead_on_date: parseDate('2024-11-27'),
        pending_app_at: parseDate('2024-11-27 00:00:00'),
        app_complete_at: parseDate('2024-12-09 00:00:00'),
        pre_qualified_at: parseDate('2024-12-11 00:00:00'),
        pre_approved_at: parseDate('2025-01-09 00:00:00'),
        active_at: parseDate('2025-01-22 00:00:00'),
        close_date: parseDate('2025-02-28'),
        lock_expiration_date: parseDate('2025-02-23'),
        arrive_loan_number: 241127004,
        loan_amount: parseDecimal('380000'),
        sales_price: parseDecimal('400000'),
        down_pmt: '5%',
        interest_rate: parseDecimal('6.25'),
        term: 360,
        principal_interest: parseDecimal('2339.36'),
        property_taxes: parseDecimal('333.33'),
        homeowners_insurance: parseDecimal('145.83'),
        mortgage_insurance: parseDecimal('177.08'),
        hoa_dues: parseDecimal('231'),
        piti: parseDecimal('3226.60'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('760'),
        total_monthly_income: parseDecimal('7800'),
        monthly_liabilities: parseDecimal('650'),
        dti: parseDecimal('43'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '4925 SW 74th Ct',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33155',
        condo_name: 'VILLAS AT BEVERLY',
        appraisal_value: '400000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: 'APPROVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-24'),
        title_eta: parseDate('2025-02-07'),
        appr_date_time: parseDate('2025-01-29 15:00:00'),
        appr_eta: parseDate('2025-02-05'),
        fin_cont: parseDate('2025-02-20'),
        buyer_agent_id: getAgentId('Silvy', 'Souza'),
        listing_agent_id: getAgentId('Sarah', 'Desamours'),
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Condo review approved',
      },
      {
        first_name: 'Marvin',
        last_name: 'Quimis',
        email: 'mquimis91@gmail.com',
        phone: '3053191516',
        dob: parseDate('1991-03-05'),
        ssn: null,
        borrower_current_address: '1850 SW 81st Ave, North Lauderdale FL 33068',
        lead_on_date: parseDate('2024-10-15'),
        pending_app_at: parseDate('2024-10-15 00:00:00'),
        app_complete_at: parseDate('2024-10-23 00:00:00'),
        pre_qualified_at: parseDate('2024-10-25 00:00:00'),
        pre_approved_at: parseDate('2024-11-21 00:00:00'),
        active_at: parseDate('2025-01-07 00:00:00'),
        close_date: parseDate('2025-02-19'),
        lock_expiration_date: parseDate('2025-02-18'),
        arrive_loan_number: 241015001,
        loan_amount: parseDecimal('309750'),
        sales_price: parseDecimal('325000'),
        down_pmt: '4.70%',
        interest_rate: parseDecimal('6.375'),
        term: 360,
        principal_interest: parseDecimal('1933.60'),
        property_taxes: parseDecimal('270.83'),
        homeowners_insurance: parseDecimal('158.33'),
        mortgage_insurance: parseDecimal('145.08'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('2507.84'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('760'),
        total_monthly_income: parseDecimal('5950'),
        monthly_liabilities: parseDecimal('300'),
        dti: parseDecimal('47'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '9460 SW 1st St',
        subject_city: 'Pembroke Pines',
        subject_state: 'FL',
        subject_zip: '33025',
        condo_name: null,
        appraisal_value: '325000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-10'),
        title_eta: parseDate('2025-01-24'),
        appr_date_time: parseDate('2025-01-17 15:30:00'),
        appr_eta: parseDate('2025-01-24'),
        fin_cont: parseDate('2025-02-14'),
        buyer_agent_id: getAgentId('Tatiana', 'Rodriguez'),
        listing_agent_id: getAgentId('Joaquin', 'Leon'),
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Sofia',
        last_name: 'Saez',
        email: 'sofiasaez3@gmail.com',
        phone: '7543009990',
        dob: parseDate('1992-10-31'),
        ssn: null,
        borrower_current_address: '12741 SW 27th St, Miramar FL 33027',
        lead_on_date: parseDate('2024-12-03'),
        pending_app_at: parseDate('2024-12-03 00:00:00'),
        app_complete_at: parseDate('2024-12-10 00:00:00'),
        pre_qualified_at: parseDate('2024-12-17 00:00:00'),
        pre_approved_at: parseDate('2024-12-30 00:00:00'),
        active_at: parseDate('2025-01-21 00:00:00'),
        close_date: parseDate('2025-03-06'),
        lock_expiration_date: parseDate('2025-03-05'),
        arrive_loan_number: 241203001,
        loan_amount: parseDecimal('345000'),
        sales_price: parseDecimal('370000'),
        down_pmt: '6.76%',
        interest_rate: parseDecimal('6.25'),
        term: 360,
        principal_interest: parseDecimal('2123.87'),
        property_taxes: parseDecimal('308.33'),
        homeowners_insurance: parseDecimal('120.83'),
        mortgage_insurance: parseDecimal('161.56'),
        hoa_dues: parseDecimal('125'),
        piti: parseDecimal('2839.59'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('725'),
        total_monthly_income: parseDecimal('6500'),
        monthly_liabilities: parseDecimal('580'),
        dti: parseDecimal('52.60'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '14255 SW 49th St',
        subject_city: 'Miramar',
        subject_state: 'FL',
        subject_zip: '33027',
        condo_name: null,
        appraisal_value: '370000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'RECEIVED',
        hoi_status: 'ORDERED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-23'),
        title_eta: parseDate('2025-02-06'),
        appr_date_time: parseDate('2025-01-28 12:00:00'),
        appr_eta: parseDate('2025-02-04'),
        fin_cont: parseDate('2025-02-27'),
        buyer_agent_id: getAgentId('Jackeline', 'Londono'),
        listing_agent_id: getAgentId('Alireza', 'Naghdian'),
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Insurance pending',
      },
      {
        first_name: 'Yanira',
        last_name: 'Gonzalez',
        email: 'yani_gonzalez90@hotmail.com',
        phone: '3057085857',
        dob: parseDate('1990-09-07'),
        ssn: null,
        borrower_current_address: '9305 Fontainebleau Blvd #318, Miami FL 33172',
        lead_on_date: parseDate('2024-11-14'),
        pending_app_at: parseDate('2024-11-14 00:00:00'),
        app_complete_at: parseDate('2024-11-20 00:00:00'),
        pre_qualified_at: parseDate('2024-11-25 00:00:00'),
        pre_approved_at: parseDate('2024-12-16 00:00:00'),
        active_at: parseDate('2025-01-14 00:00:00'),
        close_date: parseDate('2025-02-28'),
        lock_expiration_date: parseDate('2025-02-27'),
        arrive_loan_number: 241114002,
        loan_amount: parseDecimal('260000'),
        sales_price: parseDecimal('275000'),
        down_pmt: '5.45%',
        interest_rate: parseDecimal('6.125'),
        term: 360,
        principal_interest: parseDecimal('1579.22'),
        property_taxes: parseDecimal('229.17'),
        homeowners_insurance: parseDecimal('104.17'),
        mortgage_insurance: parseDecimal('121.67'),
        hoa_dues: parseDecimal('185'),
        piti: parseDecimal('2219.23'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('740'),
        total_monthly_income: parseDecimal('5200'),
        monthly_liabilities: parseDecimal('450'),
        dti: parseDecimal('51.33'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '8275 SW 152nd Ave #B212',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33193',
        condo_name: 'KENDALE LAKES',
        appraisal_value: '275000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: 'APPROVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-16'),
        title_eta: parseDate('2025-01-30'),
        appr_date_time: parseDate('2025-01-21 14:00:00'),
        appr_eta: parseDate('2025-01-28'),
        fin_cont: parseDate('2025-02-21'),
        buyer_agent_id: getAgentId('Andre', 'Martins'),
        listing_agent_id: getAgentId('Patricia', 'Rapan'),
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Condo docs approved',
      },
      {
        first_name: 'Lizmarie',
        last_name: 'Gort',
        email: 'lizgort_02@hotmail.com',
        phone: '7862970551',
        dob: parseDate('1989-12-02'),
        ssn: null,
        borrower_current_address: '9125 SW 77th Ave #I12, Miami FL 33156',
        lead_on_date: parseDate('2024-12-05'),
        pending_app_at: parseDate('2024-12-05 00:00:00'),
        app_complete_at: parseDate('2024-12-12 00:00:00'),
        pre_qualified_at: parseDate('2024-12-18 00:00:00'),
        pre_approved_at: parseDate('2025-01-13 00:00:00'),
        active_at: parseDate('2025-01-29 00:00:00'),
        close_date: parseDate('2025-03-14'),
        lock_expiration_date: null,
        arrive_loan_number: 241205002,
        loan_amount: parseDecimal('290000'),
        sales_price: parseDecimal('305000'),
        down_pmt: '4.92%',
        interest_rate: parseDecimal('6.5'),
        term: 360,
        principal_interest: parseDecimal('1833.62'),
        property_taxes: parseDecimal('254.17'),
        homeowners_insurance: parseDecimal('137.50'),
        mortgage_insurance: parseDecimal('135.83'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('2361.12'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('710'),
        total_monthly_income: parseDecimal('5600'),
        monthly_liabilities: parseDecimal('520'),
        dti: parseDecimal('51.45'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '2811 SW 132nd Ave',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33175',
        condo_name: null,
        appraisal_value: '305000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'REQUESTED',
        hoi_status: 'ORDERED',
        appraisal_status: 'SCHEDULED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-31'),
        title_eta: parseDate('2025-02-14'),
        appr_date_time: parseDate('2025-02-04 10:00:00'),
        appr_eta: parseDate('2025-02-11'),
        fin_cont: parseDate('2025-03-07'),
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: getAgentId('Brett', 'Roy'),
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Title requested, appraisal scheduled',
      },
      {
        first_name: 'Samantha',
        last_name: 'Gomez',
        email: 'sgom3z23@gmail.com',
        phone: '7866165523',
        dob: parseDate('1991-06-23'),
        ssn: null,
        borrower_current_address: '10820 SW 88th St #212, Miami FL 33176',
        lead_on_date: parseDate('2024-11-18'),
        pending_app_at: parseDate('2024-11-18 00:00:00'),
        app_complete_at: parseDate('2024-11-25 00:00:00'),
        pre_qualified_at: parseDate('2024-12-03 00:00:00'),
        pre_approved_at: parseDate('2024-12-19 00:00:00'),
        active_at: parseDate('2025-01-08 00:00:00'),
        close_date: parseDate('2025-02-21'),
        lock_expiration_date: parseDate('2025-02-20'),
        arrive_loan_number: 241118001,
        loan_amount: parseDecimal('315000'),
        sales_price: parseDecimal('335000'),
        down_pmt: '5.97%',
        interest_rate: parseDecimal('6.375'),
        term: 360,
        principal_interest: parseDecimal('1967.04'),
        property_taxes: parseDecimal('279.17'),
        homeowners_insurance: parseDecimal('145.83'),
        mortgage_insurance: parseDecimal('147.50'),
        hoa_dues: parseDecimal('215'),
        piti: parseDecimal('2754.54'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('750'),
        total_monthly_income: parseDecimal('6300'),
        monthly_liabilities: parseDecimal('600'),
        dti: parseDecimal('53.25'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '2950 SW 129th Ave #302',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33175',
        condo_name: 'TOWN & COUNTRY',
        appraisal_value: '335000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: 'APPROVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-10'),
        title_eta: parseDate('2025-01-24'),
        appr_date_time: parseDate('2025-01-15 11:30:00'),
        appr_eta: parseDate('2025-01-22'),
        fin_cont: parseDate('2025-02-14'),
        buyer_agent_id: getAgentId('Khloe', 'Guerra'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Ready for closing',
      },
      {
        first_name: 'Jonathan',
        last_name: 'Garcia',
        email: 'jgarcia_305@yahoo.com',
        phone: '3053445678',
        dob: parseDate('1988-08-15'),
        ssn: null,
        borrower_current_address: '7400 SW 57th Ave #A, South Miami FL 33143',
        lead_on_date: parseDate('2024-12-01'),
        pending_app_at: parseDate('2024-12-01 00:00:00'),
        app_complete_at: parseDate('2024-12-09 00:00:00'),
        pre_qualified_at: parseDate('2024-12-16 00:00:00'),
        pre_approved_at: parseDate('2025-01-02 00:00:00'),
        active_at: parseDate('2025-01-17 00:00:00'),
        close_date: parseDate('2025-03-03'),
        lock_expiration_date: parseDate('2025-03-02'),
        arrive_loan_number: 241201003,
        loan_amount: parseDecimal('420000'),
        sales_price: parseDecimal('445000'),
        down_pmt: '5.62%',
        interest_rate: parseDecimal('6.125'),
        term: 360,
        principal_interest: parseDecimal('2550.15'),
        property_taxes: parseDecimal('370.83'),
        homeowners_insurance: parseDecimal('175'),
        mortgage_insurance: parseDecimal('196.67'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('3292.65'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('720'),
        total_monthly_income: parseDecimal('7500'),
        monthly_liabilities: parseDecimal('750'),
        dti: parseDecimal('53.90'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '8445 SW 133rd St',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33176',
        condo_name: null,
        appraisal_value: '445000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-20'),
        title_eta: parseDate('2025-02-03'),
        appr_date_time: parseDate('2025-01-24 13:00:00'),
        appr_eta: parseDate('2025-01-31'),
        fin_cont: parseDate('2025-02-24'),
        buyer_agent_id: getAgentId('Ramon', 'Rodriguez'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Maria',
        last_name: 'Santos',
        email: 'msantos77@gmail.com',
        phone: '7543331234',
        dob: parseDate('1985-04-12'),
        ssn: null,
        borrower_current_address: '1500 SW 107th Ave #203, Miami FL 33174',
        lead_on_date: parseDate('2024-11-22'),
        pending_app_at: parseDate('2024-11-22 00:00:00'),
        app_complete_at: parseDate('2024-11-29 00:00:00'),
        pre_qualified_at: parseDate('2024-12-06 00:00:00'),
        pre_approved_at: parseDate('2024-12-23 00:00:00'),
        active_at: parseDate('2025-01-11 00:00:00'),
        close_date: parseDate('2025-02-24'),
        lock_expiration_date: parseDate('2025-02-23'),
        arrive_loan_number: 241122002,
        loan_amount: parseDecimal('275000'),
        sales_price: parseDecimal('290000'),
        down_pmt: '5.17%',
        interest_rate: parseDecimal('6.25'),
        term: 360,
        principal_interest: parseDecimal('1693.27'),
        property_taxes: parseDecimal('241.67'),
        homeowners_insurance: parseDecimal('120.83'),
        mortgage_insurance: parseDecimal('128.75'),
        hoa_dues: parseDecimal('195'),
        piti: parseDecimal('2379.52'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('730'),
        total_monthly_income: parseDecimal('5400'),
        monthly_liabilities: parseDecimal('500'),
        dti: parseDecimal('53.32'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '8790 SW 123rd Ct #C210',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33186',
        condo_name: 'PALM BAY CLUB',
        appraisal_value: '290000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: 'APPROVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-13'),
        title_eta: parseDate('2025-01-27'),
        appr_date_time: parseDate('2025-01-18 09:30:00'),
        appr_eta: parseDate('2025-01-25'),
        fin_cont: parseDate('2025-02-17'),
        buyer_agent_id: getAgentId('Teresa', 'Garcia'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Carlos',
        last_name: 'Hernandez',
        email: 'chernandez88@hotmail.com',
        phone: '3056789012',
        dob: parseDate('1987-11-28'),
        ssn: null,
        borrower_current_address: '14500 SW 88th St, Miami FL 33186',
        lead_on_date: parseDate('2024-11-09'),
        pending_app_at: parseDate('2024-11-09 00:00:00'),
        app_complete_at: parseDate('2024-11-16 00:00:00'),
        pre_qualified_at: parseDate('2024-11-22 00:00:00'),
        pre_approved_at: parseDate('2024-12-12 00:00:00'),
        active_at: parseDate('2025-01-03 00:00:00'),
        close_date: parseDate('2025-02-14'),
        lock_expiration_date: parseDate('2025-02-13'),
        arrive_loan_number: 241109001,
        loan_amount: parseDecimal('355000'),
        sales_price: parseDecimal('375000'),
        down_pmt: '5.33%',
        interest_rate: parseDecimal('6.5'),
        term: 360,
        principal_interest: parseDecimal('2244.68'),
        property_taxes: parseDecimal('312.50'),
        homeowners_insurance: parseDecimal('154.17'),
        mortgage_insurance: parseDecimal('166.25'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('2877.60'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('715'),
        total_monthly_income: parseDecimal('6700'),
        monthly_liabilities: parseDecimal('650'),
        dti: parseDecimal('52.65'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '10125 SW 162nd St',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33157',
        condo_name: null,
        appraisal_value: '375000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-06'),
        title_eta: parseDate('2025-01-20'),
        appr_date_time: parseDate('2025-01-10 14:30:00'),
        appr_eta: parseDate('2025-01-17'),
        fin_cont: parseDate('2025-02-07'),
        buyer_agent_id: getAgentId('Evan', 'Schechtman'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Jessica',
        last_name: 'Lopez',
        email: 'jlopez_95@gmail.com',
        phone: '7864445678',
        dob: parseDate('1994-02-18'),
        ssn: null,
        borrower_current_address: '9200 SW 107th Ave #104, Miami FL 33176',
        lead_on_date: parseDate('2024-12-08'),
        pending_app_at: parseDate('2024-12-08 00:00:00'),
        app_complete_at: parseDate('2024-12-15 00:00:00'),
        pre_qualified_at: parseDate('2024-12-20 00:00:00'),
        pre_approved_at: parseDate('2025-01-07 00:00:00'),
        active_at: parseDate('2025-01-25 00:00:00'),
        close_date: parseDate('2025-03-08'),
        lock_expiration_date: null,
        arrive_loan_number: 241208001,
        loan_amount: parseDecimal('298000'),
        sales_price: parseDecimal('315000'),
        down_pmt: '5.40%',
        interest_rate: parseDecimal('6.375'),
        term: 360,
        principal_interest: parseDecimal('1860.98'),
        property_taxes: parseDecimal('262.50'),
        homeowners_insurance: parseDecimal('129.17'),
        mortgage_insurance: parseDecimal('139.50'),
        hoa_dues: parseDecimal('170'),
        piti: parseDecimal('2562.15'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('745'),
        total_monthly_income: parseDecimal('5800'),
        monthly_liabilities: parseDecimal('480'),
        dti: parseDecimal('52.45'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '7920 SW 104th St #202',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33173',
        condo_name: 'SUNSET PARK',
        appraisal_value: '315000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'REQUESTED',
        hoi_status: 'ORDERED',
        appraisal_status: 'SCHEDULED',
        condo_status: 'RECEIVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-27'),
        title_eta: parseDate('2025-02-10'),
        appr_date_time: parseDate('2025-02-01 11:00:00'),
        appr_eta: parseDate('2025-02-08'),
        fin_cont: parseDate('2025-03-01'),
        buyer_agent_id: getAgentId('Silvy', 'Souza'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Condo docs received',
      },
      {
        first_name: 'Rafael',
        last_name: 'Martinez',
        email: 'rmartinez2000@yahoo.com',
        phone: '3057778899',
        dob: parseDate('1986-05-20'),
        ssn: null,
        borrower_current_address: '8500 SW 92nd St #A12, Miami FL 33173',
        lead_on_date: parseDate('2024-11-25'),
        pending_app_at: parseDate('2024-11-25 00:00:00'),
        app_complete_at: parseDate('2024-12-02 00:00:00'),
        pre_qualified_at: parseDate('2024-12-09 00:00:00'),
        pre_approved_at: parseDate('2024-12-27 00:00:00'),
        active_at: parseDate('2025-01-15 00:00:00'),
        close_date: parseDate('2025-02-26'),
        lock_expiration_date: parseDate('2025-02-25'),
        arrive_loan_number: 241125001,
        loan_amount: parseDecimal('332000'),
        sales_price: parseDecimal('350000'),
        down_pmt: '5.14%',
        interest_rate: parseDecimal('6.25'),
        term: 360,
        principal_interest: parseDecimal('2043.23'),
        property_taxes: parseDecimal('291.67'),
        homeowners_insurance: parseDecimal('141.67'),
        mortgage_insurance: parseDecimal('155.50'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('2632.07'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('735'),
        total_monthly_income: parseDecimal('6100'),
        monthly_liabilities: parseDecimal('550'),
        dti: parseDecimal('52.16'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '12350 SW 112th St',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33186',
        condo_name: null,
        appraisal_value: '350000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-17'),
        title_eta: parseDate('2025-01-31'),
        appr_date_time: parseDate('2025-01-22 10:30:00'),
        appr_eta: parseDate('2025-01-29'),
        fin_cont: parseDate('2025-02-19'),
        buyer_agent_id: getAgentId('Andre', 'Martins'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Ana',
        last_name: 'Rodriguez',
        email: 'anarodriguez84@gmail.com',
        phone: '7866221234',
        dob: parseDate('1983-09-10'),
        ssn: null,
        borrower_current_address: '10200 SW 72nd St #202, Miami FL 33173',
        lead_on_date: parseDate('2024-12-10'),
        pending_app_at: parseDate('2024-12-10 00:00:00'),
        app_complete_at: parseDate('2024-12-17 00:00:00'),
        pre_qualified_at: parseDate('2024-12-23 00:00:00'),
        pre_approved_at: parseDate('2025-01-10 00:00:00'),
        active_at: parseDate('2025-01-27 00:00:00'),
        close_date: parseDate('2025-03-10'),
        lock_expiration_date: null,
        arrive_loan_number: 241210002,
        loan_amount: parseDecimal('268000'),
        sales_price: parseDecimal('283000'),
        down_pmt: '5.30%',
        interest_rate: parseDecimal('6.5'),
        term: 360,
        principal_interest: parseDecimal('1694.24'),
        property_taxes: parseDecimal('235.83'),
        homeowners_insurance: parseDecimal('112.50'),
        mortgage_insurance: parseDecimal('125.50'),
        hoa_dues: parseDecimal('205'),
        piti: parseDecimal('2373.07'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('720'),
        total_monthly_income: parseDecimal('5300'),
        monthly_liabilities: parseDecimal('470'),
        dti: parseDecimal('53.66'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '8600 SW 133rd Ave Rd #312',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33183',
        condo_name: 'KENDALL PLACE',
        appraisal_value: '283000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'REQUESTED',
        hoi_status: 'ORDERED',
        appraisal_status: 'SCHEDULED',
        condo_status: 'RECEIVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-29'),
        title_eta: parseDate('2025-02-12'),
        appr_date_time: parseDate('2025-02-03 15:00:00'),
        appr_eta: parseDate('2025-02-10'),
        fin_cont: parseDate('2025-03-03'),
        buyer_agent_id: getAgentId('Tatiana', 'Rodriguez'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('Deephaven Mortgage LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Condo docs received',
      },
      {
        first_name: 'Miguel',
        last_name: 'Perez',
        email: 'mperez77@hotmail.com',
        phone: '3054445555',
        dob: parseDate('1990-07-14'),
        ssn: null,
        borrower_current_address: '11500 SW 88th St, Miami FL 33176',
        lead_on_date: parseDate('2024-11-30'),
        pending_app_at: parseDate('2024-11-30 00:00:00'),
        app_complete_at: parseDate('2024-12-07 00:00:00'),
        pre_qualified_at: parseDate('2024-12-13 00:00:00'),
        pre_approved_at: parseDate('2024-12-31 00:00:00'),
        active_at: parseDate('2025-01-19 00:00:00'),
        close_date: parseDate('2025-03-01'),
        lock_expiration_date: parseDate('2025-02-28'),
        arrive_loan_number: 241130002,
        loan_amount: parseDecimal('395000'),
        sales_price: parseDecimal('418000'),
        down_pmt: '5.50%',
        interest_rate: parseDecimal('6.125'),
        term: 360,
        principal_interest: parseDecimal('2399.32'),
        property_taxes: parseDecimal('348.33'),
        homeowners_insurance: parseDecimal('166.67'),
        mortgage_insurance: parseDecimal('185'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('3099.32'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('728'),
        total_monthly_income: parseDecimal('7200'),
        monthly_liabilities: parseDecimal('700'),
        dti: parseDecimal('52.77'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '9800 SW 142nd St',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33176',
        condo_name: null,
        appraisal_value: '418000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-21'),
        title_eta: parseDate('2025-02-04'),
        appr_date_time: parseDate('2025-01-26 12:30:00'),
        appr_eta: parseDate('2025-02-02'),
        fin_cont: parseDate('2025-02-22'),
        buyer_agent_id: getAgentId('Khloe', 'Guerra'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('Deephaven Mortgage LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Luis',
        last_name: 'Fernandez',
        email: 'lfernandez92@gmail.com',
        phone: '7865556677',
        dob: parseDate('1991-03-25'),
        ssn: null,
        borrower_current_address: '7800 SW 104th St #B12, Miami FL 33173',
        lead_on_date: parseDate('2024-12-06'),
        pending_app_at: parseDate('2024-12-06 00:00:00'),
        app_complete_at: parseDate('2024-12-13 00:00:00'),
        pre_qualified_at: parseDate('2024-12-19 00:00:00'),
        pre_approved_at: parseDate('2025-01-05 00:00:00'),
        active_at: parseDate('2025-01-23 00:00:00'),
        close_date: parseDate('2025-03-05'),
        lock_expiration_date: null,
        arrive_loan_number: 241206001,
        loan_amount: parseDecimal('282000'),
        sales_price: parseDecimal('298000'),
        down_pmt: '5.37%',
        interest_rate: parseDecimal('6.375'),
        term: 360,
        principal_interest: parseDecimal('1760.39'),
        property_taxes: parseDecimal('248.33'),
        homeowners_insurance: parseDecimal('125'),
        mortgage_insurance: parseDecimal('132'),
        hoa_dues: parseDecimal('190'),
        piti: parseDecimal('2455.72'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('738'),
        total_monthly_income: parseDecimal('5500'),
        monthly_liabilities: parseDecimal('490'),
        dti: parseDecimal('53.56'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '8950 SW 142nd Ave #207',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33186',
        condo_name: 'LAGO MAR',
        appraisal_value: '298000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'REQUESTED',
        hoi_status: 'ORDERED',
        appraisal_status: 'SCHEDULED',
        condo_status: 'RECEIVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-25'),
        title_eta: parseDate('2025-02-08'),
        appr_date_time: parseDate('2025-01-30 14:00:00'),
        appr_eta: parseDate('2025-02-06'),
        fin_cont: parseDate('2025-02-26'),
        buyer_agent_id: getAgentId('Jackeline', 'Londono'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('Champions Funding LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Condo docs received',
      },
      {
        first_name: 'Patricia',
        last_name: 'Diaz',
        email: 'pdiaz85@yahoo.com',
        phone: '3052223344',
        dob: parseDate('1984-11-08'),
        ssn: null,
        borrower_current_address: '13200 SW 92nd Ave, Miami FL 33176',
        lead_on_date: parseDate('2024-11-20'),
        pending_app_at: parseDate('2024-11-20 00:00:00'),
        app_complete_at: parseDate('2024-11-27 00:00:00'),
        pre_qualified_at: parseDate('2024-12-04 00:00:00'),
        pre_approved_at: parseDate('2024-12-20 00:00:00'),
        active_at: parseDate('2025-01-09 00:00:00'),
        close_date: parseDate('2025-02-22'),
        lock_expiration_date: parseDate('2025-02-21'),
        arrive_loan_number: 241120001,
        loan_amount: parseDecimal('365000'),
        sales_price: parseDecimal('385000'),
        down_pmt: '5.19%',
        interest_rate: parseDecimal('6.25'),
        term: 360,
        principal_interest: parseDecimal('2247.01'),
        property_taxes: parseDecimal('320.83'),
        homeowners_insurance: parseDecimal('158.33'),
        mortgage_insurance: parseDecimal('171'),
        hoa_dues: parseDecimal('0'),
        piti: parseDecimal('2897.17'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('722'),
        total_monthly_income: parseDecimal('6800'),
        monthly_liabilities: parseDecimal('620'),
        dti: parseDecimal('51.72'),
        escrows: 'Escrowed',
        property_type: 'Single Family',
        occupancy: 'Primary Residence',
        subject_address_1: '11450 SW 152nd St',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33157',
        condo_name: null,
        appraisal_value: '385000',
        disclosure_status: 'SIGNED',
        loan_status: 'CTC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: null,
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-11'),
        title_eta: parseDate('2025-01-25'),
        appr_date_time: parseDate('2025-01-16 11:00:00'),
        appr_eta: parseDate('2025-01-23'),
        fin_cont: parseDate('2025-02-15'),
        buyer_agent_id: getAgentId('Ramon', 'Rodriguez'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('Champions Funding LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: null,
      },
      {
        first_name: 'Eduardo',
        last_name: 'Silva',
        email: 'esilva89@gmail.com',
        phone: '7869998877',
        dob: parseDate('1988-01-17'),
        ssn: null,
        borrower_current_address: '8300 SW 107th Ave #101, Miami FL 33173',
        lead_on_date: parseDate('2024-12-02'),
        pending_app_at: parseDate('2024-12-02 00:00:00'),
        app_complete_at: parseDate('2024-12-09 00:00:00'),
        pre_qualified_at: parseDate('2024-12-15 00:00:00'),
        pre_approved_at: parseDate('2025-01-01 00:00:00'),
        active_at: parseDate('2025-01-18 00:00:00'),
        close_date: parseDate('2025-03-02'),
        lock_expiration_date: parseDate('2025-03-01'),
        arrive_loan_number: 241202002,
        loan_amount: parseDecimal('248000'),
        sales_price: parseDecimal('262000'),
        down_pmt: '5.34%',
        interest_rate: parseDecimal('6.5'),
        term: 360,
        principal_interest: parseDecimal('1567.68'),
        property_taxes: parseDecimal('218.33'),
        homeowners_insurance: parseDecimal('104.17'),
        mortgage_insurance: parseDecimal('116.17'),
        hoa_dues: parseDecimal('175'),
        piti: parseDecimal('2181.35'),
        loan_type: 'Conventional',
        program: 'FNMA 97% LTV',
        pr_type: 'Purchase',
        income_type: 'W2',
        estimated_fico: parseFico('710'),
        total_monthly_income: parseDecimal('5000'),
        monthly_liabilities: parseDecimal('420'),
        dti: parseDecimal('52.03'),
        escrows: 'Escrowed',
        property_type: 'Condo',
        occupancy: 'Primary Residence',
        subject_address_1: '7750 SW 117th Ct #302',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33183',
        condo_name: 'VILLAGE GREEN',
        appraisal_value: '262000',
        disclosure_status: 'SIGNED',
        loan_status: 'AWC',
        title_status: 'RECEIVED',
        hoi_status: 'RECEIVED',
        appraisal_status: 'RECEIVED',
        condo_status: 'APPROVED',
        cd_status: null,
        package_status: null,
        mi_status: null,
        title_ordered_date: parseDate('2025-01-20'),
        title_eta: parseDate('2025-02-03'),
        appr_date_time: parseDate('2025-01-25 10:00:00'),
        appr_eta: parseDate('2025-02-01'),
        fin_cont: parseDate('2025-02-23'),
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D MORTGAGE LLC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
        notes: 'Condo approved, ready for closing',
      },
    ];

    // Step 11: Insert leads
    let insertedLeadsCount = 0;

    if (confirm) {
      for (const lead of activeLeads) {
        const { error } = await supabase.from('leads').insert(lead);

        if (error) {
          console.error(`[migrate-active] Error inserting lead ${lead.first_name} ${lead.last_name}:`, error);
        } else {
          insertedLeadsCount++;
          console.log(`[migrate-active] Inserted lead: ${lead.first_name} ${lead.last_name}`);
        }
      }
    }

    // Step 12: Return summary
    const summary = {
      mode,
      deleted: {
        borrowers: deletedBorrowers,
        tasks: deletedTasks,
        leads: deletedLeads,
      },
      created: {
        agents: createdAgentsCount,
        lenders: createdLendersCount,
      },
      inserted: {
        leads: confirm ? insertedLeadsCount : activeLeads.length,
      },
    };

    console.log('[migrate-active] Migration summary:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[migrate-active] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
