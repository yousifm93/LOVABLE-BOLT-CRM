import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants
const pastClientsPipelineStageId = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd';
const defaultAccountId = '47e707c5-62d0-4ee9-99a3-76572c73a8e1';
const defaultUserId = '08e73d69-4707-4773-84a4-69ce2acd6a11';

// Helper Functions
function parseDate(value: string | null | undefined): string | null {
  if (!value || value === '' || value === 'N/A') return null;
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

function parseDecimal(value: any): number | null {
  if (!value || value === '' || value === 'N/A') return null;
  const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? null : num;
}

function normalizeTerm(value: any): number | null {
  const num = parseDecimal(value);
  if (!num) return null;
  return num <= 50 ? num * 12 : num;
}

function mapPrType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === 'P') return 'P';
  if (upper === 'R') return 'R';
  if (upper === 'HELOC') return 'HELOC';
  return null;
}

function mapOccupancy(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper.includes('PRIMARY') || upper.includes('OWNER')) return 'Primary Residence';
  if (upper.includes('INVESTMENT') || upper.includes('INVESTOR')) return 'Investment Property';
  if (upper.includes('SECOND')) return 'Second Home';
  return null;
}

function mapPropertyType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper.includes('CONDO') || upper.includes('CONDOMINIUM')) return 'Condo';
  if (upper.includes('SFR') || upper.includes('SINGLE')) return 'Single Family';
  if (upper.includes('TOWNHOUSE') || upper.includes('TOWNHOME')) return 'Townhouse';
  return null;
}

function mapCondoStatus(value: string | null): string | null {
  if (!value || value === 'N/A' || value === 'LIMITED') return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'ORDERED': 'Ordered',
    'RECEIVED': 'Received',
    'APPROVED': 'Approved',
  };
  return map[upper] || null;
}

function mapEscrows(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === 'YES') return 'Waived';
  if (upper === 'NO') return 'Escrowed';
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const body = await req.json();
    const isApplyMode = body.confirm === true;

    console.log(`Running in ${isApplyMode ? 'APPLY' : 'PREVIEW'} mode`);

    // Define new lenders to create
    const newLenders = [
      { lender_name: 'UWM', account_id: defaultAccountId },
      { lender_name: 'REMN', account_id: defaultAccountId },
      { lender_name: 'A&D MORTGAGE LLC', account_id: defaultAccountId },
      { lender_name: 'PennyMac Loan Services, LLC', account_id: defaultAccountId },
      { lender_name: 'Sierra Pacific Mortgage Company, Inc.', account_id: defaultAccountId },
      { lender_name: 'JMAC Lending, Inc.', account_id: defaultAccountId },
    ];

    // Define new agents to create
    const newAgents = [
      { first_name: 'Jamie', last_name: 'Austin', account_id: defaultAccountId },
      { first_name: 'Simo', last_name: 'Labriti', account_id: defaultAccountId },
      { first_name: 'Candy', last_name: 'Del Valle', account_id: defaultAccountId },
      { first_name: 'Jonathan', last_name: 'Cedeno', account_id: defaultAccountId },
      { first_name: 'Nelly', last_name: 'Macias', account_id: defaultAccountId },
      { first_name: 'Richard', last_name: 'Corrales', account_id: defaultAccountId },
      { first_name: 'Jessica', last_name: 'Turner', account_id: defaultAccountId },
      { first_name: 'Piermassimo', last_name: 'Picchiura', account_id: defaultAccountId },
      { first_name: 'Elizabeth', last_name: 'Zuleta', account_id: defaultAccountId },
      { first_name: 'Sandeep', last_name: 'Sakinala', account_id: defaultAccountId },
      { first_name: 'Cristian', last_name: 'Consuegra', account_id: defaultAccountId },
      { first_name: 'Cristina', last_name: 'Cesana', account_id: defaultAccountId },
      { first_name: 'Debbie', last_name: 'Potts', account_id: defaultAccountId },
      { first_name: 'Ursula', last_name: 'Apaestegui', account_id: defaultAccountId },
      { first_name: 'Silvio', last_name: 'De Cardenas', account_id: defaultAccountId },
      { first_name: 'Roman', last_name: 'Semykin', account_id: defaultAccountId },
      { first_name: 'Drew', last_name: 'Hutcheson', account_id: defaultAccountId },
      { first_name: 'Fatma', last_name: 'Serhan', account_id: defaultAccountId },
      { first_name: 'Graziella', last_name: 'Offen', account_id: defaultAccountId },
      { first_name: 'Ohad', last_name: 'Einhorn', account_id: defaultAccountId },
      { first_name: 'Cherie', last_name: 'Callahan', account_id: defaultAccountId },
      { first_name: 'Nakarid', last_name: 'Melean', account_id: defaultAccountId },
      { first_name: 'Joanne', last_name: 'Rudowski', account_id: defaultAccountId },
      { first_name: 'Yamile', last_name: 'Zayed', account_id: defaultAccountId },
      { first_name: 'Francois', last_name: 'Lopez', account_id: defaultAccountId },
    ];

    // Create lenders
    let createdLenders: any[] = [];
    if (isApplyMode) {
      const { data: lenderData, error: lenderError } = await supabase
        .from('approved_lenders')
        .upsert(newLenders, { onConflict: 'lender_name,account_id' })
        .select();

      if (lenderError) {
        throw new Error(`Failed to create lenders: ${lenderError.message}`);
      }
      createdLenders = lenderData || [];
      console.log(`Created/updated ${createdLenders.length} lenders`);
    } else {
      console.log(`PREVIEW: Would create/update ${newLenders.length} lenders`);
    }

    // Fetch all lenders for lookup
    const { data: allLenders } = await supabase
      .from('approved_lenders')
      .select('*')
      .eq('account_id', defaultAccountId);
    createdLenders = allLenders || [];

    // Create agents
    let createdAgents: any[] = [];
    if (isApplyMode) {
      const { data: agentData, error: agentError } = await supabase
        .from('buyer_agents')
        .upsert(newAgents, { onConflict: 'first_name,last_name,account_id' })
        .select();

      if (agentError) {
        throw new Error(`Failed to create agents: ${agentError.message}`);
      }
      createdAgents = agentData || [];
      console.log(`Created/updated ${createdAgents.length} agents`);
    } else {
      console.log(`PREVIEW: Would create/update ${newAgents.length} agents`);
    }

    // Fetch all agents for lookup
    const { data: allAgents } = await supabase
      .from('buyer_agents')
      .select('*')
      .eq('account_id', defaultAccountId);
    createdAgents = allAgents || [];

    // Helper to get agent ID
    const getAgentId = (firstName: string | null, lastName: string | null): string | null => {
      if (!firstName || !lastName) return null;
      if (firstName === 'REFI' || firstName === 'My Team') return null;
      const agent = createdAgents.find(a => 
        a.first_name?.toLowerCase() === firstName.toLowerCase() && 
        a.last_name?.toLowerCase() === lastName.toLowerCase()
      );
      return agent?.id || null;
    };

    // Helper to get lender ID
    const getLenderId = (lenderName: string | null): string | null => {
      if (!lenderName) return null;
      const upper = lenderName.toUpperCase();
      
      const lenderMap: Record<string, string> = {
        'UWM': 'UWM',
        'REMN': 'REMN',
        'A&D': 'A&D MORTGAGE LLC',
        'PENNYMAC': 'PennyMac Loan Services, LLC',
        'SIERRA PACIFIC': 'Sierra Pacific Mortgage Company, Inc.',
        'JMAC': 'JMAC Lending, Inc.',
      };
      
      const fullName = lenderMap[upper] || lenderName;
      const lender = createdLenders.find(l => 
        l.lender_name?.toLowerCase() === fullName.toLowerCase()
      );
      return lender?.id || null;
    };

    // Define all 22 past clients data
    const pastClientsData = [
      // 1. Abraham Pinheiro
      {
        first_name: 'Abraham',
        last_name: 'Pinheiro',
        email: 'abraao-pinheiro@hotmail.com',
        phone: '7863225043',
        dob: parseDate('1991-12-25'),
        arrive_loan_number: '1225540665',
        lender_loan_number: null,
        approved_lender_id: getLenderId('UWM'),
        close_date: parseDate('2025-09-17'),
        loan_amount: parseDecimal('176250'),
        sales_price: parseDecimal('235000'),
        appraisal_value: null,
        interest_rate: parseDecimal('6.625'),
        term: normalizeTerm('30'),
        subject_address: '551 Michigan Ave',
        subject_address2: '#125',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33139',
        condo_name: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('75'),
        appr_ordered_date: parseDate('2025-08-21'),
        title_ordered_date: parseDate('2025-08-22'),
        hoi_bound_date: parseDate('2025-08-27'),
        condo_docs_ord_date: parseDate('2025-08-20'),
        cd_sent_date: parseDate('2025-09-10'),
        cd_signed_date: parseDate('2025-09-11'),
        initial_closing_pkg_sent_date: null,
        final_closing_pkg_sent_date: parseDate('2025-09-13'),
        last_call_date: parseDate('2025-09-25'),
        buyer_agent_id: getAgentId('Jamie', 'Austin'),
        listing_agent_id: getAgentId('Piermassimo', 'Picchiura'),
        lead_on_date: null,
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-09-17'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 2. Yousra Soltana
      {
        first_name: 'Yousra',
        last_name: 'Soltana',
        email: 'yosrasoltana25@gmail.com',
        phone: '19542685545',
        dob: parseDate('1988-01-25'),
        arrive_loan_number: '2101072867',
        lender_loan_number: null,
        approved_lender_id: getLenderId('REMN'),
        close_date: parseDate('2025-09-15'),
        loan_amount: parseDecimal('189000'),
        sales_price: parseDecimal('210000'),
        appraisal_value: null,
        interest_rate: parseDecimal('6.25'),
        term: normalizeTerm('30'),
        subject_address: '9370 SW 8TH ST',
        subject_address2: '#402',
        city: 'Boca Raton',
        state: 'FL',
        zip: '33428',
        condo_name: 'ISLE OF SANDALFOOT',
        property_type: mapPropertyType('SFR'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('90'),
        appr_ordered_date: parseDate('2025-09-08'),
        title_ordered_date: parseDate('2025-08-12'),
        hoi_quote_req_date: parseDate('2025-08-19'),
        hoi_bound_date: parseDate('2025-08-25'),
        condo_docs_ord_date: parseDate('2025-08-12'),
        condo_doc_recd_date: parseDate('2025-08-25'),
        cd_sent_date: parseDate('2025-09-12'),
        cd_signed_date: parseDate('2025-09-15'),
        final_closing_pkg_sent_date: parseDate('2025-09-15'),
        last_call_date: parseDate('2025-11-03'),
        buyer_agent_id: getAgentId('Simo', 'Labriti'),
        listing_agent_id: getAgentId('Elizabeth', 'Zuleta'),
        lead_on_date: parseDate('2025-04-05'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-09-15'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 3. Benito Rodriguez
      {
        first_name: 'Benito',
        last_name: 'Rodriguez',
        email: null,
        phone: '17863182293',
        dob: parseDate('1963-11-22'),
        arrive_loan_number: '1124023',
        lender_loan_number: null,
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-09-12'),
        loan_amount: parseDecimal('231000'),
        sales_price: parseDecimal('330000'),
        appraisal_value: parseDecimal('345000'),
        interest_rate: parseDecimal('6.99'),
        term: normalizeTerm('360'),
        subject_address: '2899 Collins Avenue',
        subject_address2: 'Unit 637',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33140',
        condo_name: 'Triton Tower',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('70'),
        appr_ordered_date: parseDate('2025-07-03'),
        title_ordered_date: parseDate('2025-07-07'),
        hoi_quote_req_date: parseDate('2025-07-03'),
        hoi_bound_date: parseDate('2025-08-13'),
        condo_docs_ord_date: null,
        condo_doc_recd_date: parseDate('2025-07-28'),
        cd_sent_date: parseDate('2025-09-11'),
        cd_signed_date: null,
        final_closing_pkg_sent_date: parseDate('2025-09-11'),
        last_call_date: null,
        buyer_agent_id: getAgentId('Candy', 'Del Valle'),
        listing_agent_id: getAgentId('Candy', 'Del Valle'),
        lead_on_date: parseDate('2025-06-25'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-09-12'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 4. Bill Wiley (REFI)
      {
        first_name: 'William',
        last_name: 'Wiley',
        email: 'bill@oceanbreeze.me',
        phone: '7035997692',
        dob: parseDate('1958-11-13'),
        arrive_loan_number: '1132789',
        lender_loan_number: null,
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-08-28'),
        loan_amount: parseDecimal('264500'),
        sales_price: parseDecimal('1150000'),
        appraisal_value: parseDecimal('1150000'),
        interest_rate: parseDecimal('6.75'),
        term: normalizeTerm('30'),
        subject_address: '2900 NE 7th Ave',
        subject_address2: '3205',
        city: 'Miami',
        state: 'FL',
        zip: '33137',
        condo_name: 'Biscayne Beach',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('R'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('23'),
        appr_ordered_date: parseDate('2025-08-11'),
        title_ordered_date: parseDate('2025-08-12'),
        hoi_quote_req_date: parseDate('2025-08-13'),
        hoi_bound_date: parseDate('2025-08-20'),
        condo_docs_ord_date: parseDate('2025-08-12'),
        condo_doc_recd_date: parseDate('2025-08-20'),
        cd_sent_date: parseDate('2025-08-27'),
        cd_signed_date: parseDate('2025-08-26'),
        final_closing_pkg_sent_date: parseDate('2025-08-28'),
        last_call_date: parseDate('2025-08-29'),
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-08-05'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-28'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 5. Evan Schechtman
      {
        first_name: 'Evan',
        last_name: 'Schechtman',
        email: 'evan@blackbookproperties.com',
        phone: '18569389213',
        dob: parseDate('1998-03-26'),
        arrive_loan_number: '14679953',
        lender_loan_number: null,
        approved_lender_id: getLenderId('PENNYMAC'),
        close_date: parseDate('2025-08-27'),
        loan_amount: parseDecimal('658750'),
        sales_price: parseDecimal('775000'),
        appraisal_value: parseDecimal('775000'),
        interest_rate: parseDecimal('7.75'),
        term: normalizeTerm('30'),
        subject_address: '1200 Brickell Bay Drive',
        subject_address2: '#3102',
        city: 'Miami',
        state: 'FL',
        zip: '33131',
        condo_name: 'Club at Brickell Bay',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('85'),
        appr_ordered_date: parseDate('2025-07-28'),
        title_ordered_date: parseDate('2025-07-28'),
        hoi_quote_req_date: parseDate('2025-07-31'),
        hoi_bound_date: parseDate('2025-08-01'),
        condo_docs_ord_date: parseDate('2025-07-24'),
        condo_doc_recd_date: parseDate('2025-08-04'),
        cd_ready_date: parseDate('2025-08-13'),
        cd_sent_date: parseDate('2025-08-14'),
        cd_signed_date: parseDate('2025-08-20'),
        final_closing_pkg_sent_date: parseDate('2025-08-25'),
        last_call_date: parseDate('2025-09-30'),
        buyer_agent_id: getAgentId('Evan', 'Schechtman'),
        listing_agent_id: getAgentId('Sandeep', 'Sakinala'),
        lead_on_date: parseDate('2025-07-14'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-27'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 6. Henry De Matos
      {
        first_name: 'Henry',
        last_name: 'De Matos',
        email: 'dematoshenry@gmail.com',
        phone: '13057781078',
        dob: parseDate('1986-01-05'),
        arrive_loan_number: '6191484726',
        lender_loan_number: null,
        approved_lender_id: getLenderId('PENNYMAC'),
        close_date: parseDate('2025-08-26'),
        loan_amount: parseDecimal('279837'),
        sales_price: parseDecimal('285000'),
        appraisal_value: parseDecimal('285000'),
        interest_rate: parseDecimal('6.49'),
        term: normalizeTerm('30'),
        subject_address: '2015 SE 10TH AVE',
        subject_address2: 'APT #123',
        city: 'Fort Lauderdale',
        state: 'FL',
        zip: '33316',
        condo_name: 'Village East',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('98.18842105'),
        appr_ordered_date: parseDate('2025-08-07'),
        title_ordered_date: parseDate('2025-07-31'),
        hoi_quote_req_date: parseDate('2025-08-07'),
        hoi_bound_date: parseDate('2025-08-14'),
        condo_docs_ord_date: parseDate('2025-08-01'),
        condo_doc_recd_date: parseDate('2025-08-05'),
        cd_ready_date: parseDate('2025-08-19'),
        cd_sent_date: parseDate('2025-08-19'),
        cd_signed_date: parseDate('2025-08-21'),
        final_closing_pkg_sent_date: parseDate('2025-08-25'),
        last_call_date: parseDate('2025-08-27'),
        buyer_agent_id: getAgentId('Jonathan', 'Cedeno'),
        listing_agent_id: getAgentId('Cristian', 'Consuegra'),
        lead_on_date: parseDate('2025-07-10'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-26'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 7. John Sutter
      {
        first_name: 'John',
        last_name: 'Sutter',
        email: 'jdvsblue@gmail.com',
        phone: '13055277093',
        dob: parseDate('1967-02-03'),
        arrive_loan_number: '14574381',
        lender_loan_number: '#1123547',
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-08-21'),
        loan_amount: parseDecimal('480000'),
        sales_price: parseDecimal('600000'),
        appraisal_value: parseDecimal('640000'),
        interest_rate: parseDecimal('7.625'),
        term: normalizeTerm('360'),
        subject_address: '5600 Collins Avenue',
        subject_address2: '7Y',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33140',
        condo_name: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('80'),
        appr_ordered_date: parseDate('2025-07-08'),
        title_ordered_date: parseDate('2025-07-01'),
        hoi_bound_date: parseDate('2025-08-05'),
        condo_docs_ord_date: parseDate('2025-07-08'),
        condo_doc_recd_date: parseDate('2025-07-15'),
        cd_ready_date: parseDate('2025-08-06'),
        cd_sent_date: parseDate('2025-08-14'),
        cd_signed_date: parseDate('2025-08-20'),
        final_closing_pkg_sent_date: parseDate('2025-08-21'),
        last_call_date: parseDate('2025-08-27'),
        buyer_agent_id: getAgentId('Nelly', 'Macias'),
        listing_agent_id: getAgentId('Nelly', 'Macias'),
        lead_on_date: parseDate('2025-06-27'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-21'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 8. Jeffery Bier
      {
        first_name: 'Jeffery',
        last_name: 'Bier',
        email: 'jeff@carlsonbier.com',
        phone: '13125202214',
        dob: parseDate('1970-09-16'),
        arrive_loan_number: '14528073',
        lender_loan_number: '1123619',
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-08-19'),
        loan_amount: parseDecimal('532000'),
        sales_price: parseDecimal('760000'),
        appraisal_value: parseDecimal('761000'),
        interest_rate: parseDecimal('7.75'),
        term: normalizeTerm('30'),
        subject_address: '100 Lincoln Road',
        subject_address2: 'Unit 908',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33139',
        condo_name: 'Decoplage',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('70'),
        appr_ordered_date: parseDate('2025-07-03'),
        hoi_quote_req_date: parseDate('2025-07-11'),
        title_ordered_date: parseDate('2025-07-03'),
        hoi_bound_date: parseDate('2025-08-11'),
        condo_docs_ord_date: parseDate('2025-07-08'),
        condo_doc_recd_date: parseDate('2025-07-11'),
        cd_sent_date: parseDate('2025-08-12'),
        cd_signed_date: null,
        final_closing_pkg_sent_date: parseDate('2025-08-14'),
        last_call_date: parseDate('2025-11-06'),
        buyer_agent_id: getAgentId('Richard', 'Corrales'),
        listing_agent_id: getAgentId('Cristina', 'Cesana'),
        lead_on_date: parseDate('2025-06-19'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-19'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 9. Shane Moore
      {
        first_name: 'Shane',
        last_name: 'Moore',
        email: 'smoore808@gmail.com',
        phone: '18085513614',
        dob: parseDate('1992-12-02'),
        arrive_loan_number: '14340846',
        lender_loan_number: '6191452927',
        approved_lender_id: getLenderId('PENNYMAC'),
        close_date: parseDate('2025-08-18'),
        loan_amount: parseDecimal('496000'),
        sales_price: parseDecimal('675000'),
        appraisal_value: parseDecimal('610000'),
        interest_rate: parseDecimal('7.375'),
        term: normalizeTerm('30'),
        subject_address: '690 SW 1st CT',
        subject_address2: '#3116',
        city: 'MIAMI',
        state: 'FL',
        zip: '33130',
        condo_name: 'Neo Vertika',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('73.48148148'),
        appr_ordered_date: parseDate('2025-07-11'),
        title_ordered_date: parseDate('2025-07-15'),
        hoi_quote_req_date: parseDate('2025-08-01'),
        hoi_bound_date: parseDate('2025-08-07'),
        condo_docs_ord_date: parseDate('2025-07-14'),
        condo_doc_recd_date: parseDate('2025-07-18'),
        cd_ready_date: parseDate('2025-08-05'),
        cd_sent_date: parseDate('2025-08-11'),
        cd_signed_date: parseDate('2025-08-12'),
        final_closing_pkg_sent_date: parseDate('2025-08-15'),
        last_call_date: parseDate('2025-09-05'),
        buyer_agent_id: getAgentId('Jessica', 'Turner'),
        listing_agent_id: getAgentId('Debbie', 'Potts'),
        lead_on_date: parseDate('2025-06-08'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-18'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 10. Krysten Naranjo (REFI)
      {
        first_name: 'Krysten',
        last_name: 'Naranjo',
        email: 'krystennaranjo@gmail.com',
        phone: '13054940625',
        dob: parseDate('1995-06-21'),
        arrive_loan_number: '14405538',
        lender_loan_number: '1128211',
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-08-13'),
        loan_amount: parseDecimal('275000'),
        sales_price: parseDecimal('710000'),
        appraisal_value: parseDecimal('710000'),
        interest_rate: parseDecimal('6.99'),
        term: normalizeTerm('360'),
        subject_address: '17441 Northwest 52nd Place',
        subject_address2: null,
        city: 'Miami Gardens',
        state: 'FL',
        zip: '33055',
        condo_name: null,
        property_type: mapPropertyType('SFR'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('R'),
        condo_status: mapCondoStatus('N/A'),
        ltv: parseDecimal('38.73239437'),
        appr_ordered_date: parseDate('2025-07-29'),
        title_ordered_date: parseDate('2025-07-29'),
        hoi_quote_req_date: parseDate('2025-08-06'),
        hoi_bound_date: parseDate('2025-08-06'),
        condo_docs_ord_date: null,
        condo_doc_recd_date: null,
        cd_sent_date: parseDate('2025-08-12'),
        cd_signed_date: null,
        final_closing_pkg_sent_date: parseDate('2025-08-12'),
        last_call_date: parseDate('2025-09-30'),
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-05-28'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-13'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 11. Emmanuel Giboyeaux
      {
        first_name: 'Emmanuel',
        last_name: 'Giboyeaux',
        email: 'emmanuelgiboyeaux@gmail.com',
        phone: '17864067234',
        dob: parseDate('1990-04-16'),
        arrive_loan_number: '14308089',
        lender_loan_number: '6191432629',
        approved_lender_id: getLenderId('PENNYMAC'),
        close_date: parseDate('2025-08-05'),
        loan_amount: parseDecimal('434300'),
        sales_price: parseDecimal('542900'),
        appraisal_value: parseDecimal('542900'),
        interest_rate: parseDecimal('7.375'),
        term: normalizeTerm('30'),
        subject_address: '3350 SW 27TH AVE',
        subject_address2: '#907',
        city: 'MIAMI',
        state: 'FL',
        zip: '33133',
        condo_name: 'Grove at Grand Bay South',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('80'),
        appr_ordered_date: parseDate('2025-07-07'),
        title_ordered_date: parseDate('2025-07-07'),
        hoi_quote_req_date: parseDate('2025-07-09'),
        hoi_bound_date: parseDate('2025-07-15'),
        condo_docs_ord_date: parseDate('2025-07-03'),
        condo_doc_recd_date: parseDate('2025-07-09'),
        cd_ready_date: parseDate('2025-07-21'),
        cd_sent_date: parseDate('2025-07-24'),
        cd_signed_date: parseDate('2025-07-31'),
        final_closing_pkg_sent_date: parseDate('2025-08-01'),
        last_call_date: parseDate('2025-10-09'),
        buyer_agent_id: getAgentId('Ursula', 'Apaestegui'),
        listing_agent_id: getAgentId('Graziella', 'Offen'),
        lead_on_date: parseDate('2025-05-21'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-05'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 12. Minas Miliaras
      {
        first_name: 'Minas',
        last_name: 'Miliaras',
        email: 'minasmiliaras@yahoo.gr',
        phone: '16469034399',
        dob: parseDate('1995-05-05'),
        arrive_loan_number: '14268426',
        lender_loan_number: '1126883',
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-08-01'),
        loan_amount: parseDecimal('275000'),
        sales_price: parseDecimal('350000'),
        appraisal_value: parseDecimal('350000'),
        interest_rate: parseDecimal('7.875'),
        term: normalizeTerm('30'),
        subject_address: '1800 Sunset Harbour Drive',
        subject_address2: '#1409',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33139',
        condo_name: 'ICON South Beach',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('78.57142857'),
        appr_ordered_date: parseDate('2025-07-01'),
        title_ordered_date: parseDate('2025-06-28'),
        hoi_quote_req_date: parseDate('2025-07-01'),
        hoi_bound_date: parseDate('2025-07-08'),
        condo_docs_ord_date: parseDate('2025-06-25'),
        condo_doc_recd_date: parseDate('2025-06-26'),
        cd_ready_date: parseDate('2025-07-18'),
        cd_sent_date: parseDate('2025-07-21'),
        cd_signed_date: parseDate('2025-07-31'),
        final_closing_pkg_sent_date: parseDate('2025-07-31'),
        last_call_date: parseDate('2025-08-06'),
        buyer_agent_id: getAgentId('Silvio', 'De Cardenas'),
        listing_agent_id: getAgentId('Ohad', 'Einhorn'),
        lead_on_date: parseDate('2025-04-30'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-08-01'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 13. Fabricio Pinheiro
      {
        first_name: 'Fabricio',
        last_name: 'Pinheiro',
        email: 'fabriciorgpinheiro@gmail.com',
        phone: '12026008012',
        dob: parseDate('1987-02-06'),
        arrive_loan_number: '14748764',
        lender_loan_number: '6191504928',
        approved_lender_id: getLenderId('PENNYMAC'),
        close_date: parseDate('2025-09-25'),
        loan_amount: parseDecimal('340000'),
        sales_price: parseDecimal('425000'),
        appraisal_value: parseDecimal('425000'),
        interest_rate: parseDecimal('7.125'),
        term: normalizeTerm('30'),
        subject_address: '3350 SW 27TH AVE',
        subject_address2: '#1004',
        city: 'MIAMI',
        state: 'FL',
        zip: '33133',
        condo_name: 'Grove at Grand Bay South',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('80'),
        appr_ordered_date: parseDate('2025-08-13'),
        title_ordered_date: parseDate('2025-08-13'),
        hoi_quote_req_date: parseDate('2025-08-14'),
        hoi_bound_date: parseDate('2025-09-19'),
        condo_docs_ord_date: parseDate('2025-08-13'),
        condo_doc_recd_date: parseDate('2025-08-20'),
        cd_ready_date: parseDate('2025-09-13'),
        cd_sent_date: parseDate('2025-09-13'),
        cd_signed_date: parseDate('2025-09-20'),
        final_closing_pkg_sent_date: parseDate('2025-09-23'),
        last_call_date: parseDate('2025-11-05'),
        buyer_agent_id: getAgentId('Roman', 'Semykin'),
        listing_agent_id: getAgentId('Cherie', 'Callahan'),
        lead_on_date: parseDate('2025-07-23'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-09-25'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 14. Franklin Reid
      {
        first_name: 'Franklin',
        last_name: 'Reid',
        email: 'francisreid63@gmail.com',
        phone: '12019911363',
        dob: parseDate('1963-12-17'),
        arrive_loan_number: '14741979',
        lender_loan_number: null,
        approved_lender_id: null,
        close_date: parseDate('2025-09-26'),
        loan_amount: parseDecimal('390000'),
        sales_price: parseDecimal('650000'),
        appraisal_value: parseDecimal('650000'),
        interest_rate: parseDecimal('7.375'),
        term: normalizeTerm('30'),
        subject_address: '2000 Island Blvd',
        subject_address2: '#2304',
        city: 'Aventura',
        state: 'FL',
        zip: '33160',
        condo_name: 'Island at Aventura',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('60'),
        appr_ordered_date: parseDate('2025-08-28'),
        title_ordered_date: parseDate('2025-08-28'),
        hoi_quote_req_date: parseDate('2025-09-04'),
        hoi_bound_date: parseDate('2025-09-13'),
        condo_docs_ord_date: parseDate('2025-08-27'),
        condo_doc_recd_date: parseDate('2025-09-11'),
        cd_ready_date: parseDate('2025-09-13'),
        cd_sent_date: parseDate('2025-09-16'),
        cd_signed_date: parseDate('2025-09-17'),
        final_closing_pkg_sent_date: parseDate('2025-09-20'),
        last_call_date: parseDate('2025-10-31'),
        buyer_agent_id: getAgentId('Drew', 'Hutcheson'),
        listing_agent_id: getAgentId('Nakarid', 'Melean'),
        lead_on_date: parseDate('2025-08-05'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-09-26'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 15. Amy Alley
      {
        first_name: 'Amy',
        last_name: 'Alley',
        email: 'joalley@aol.com',
        phone: '19706187400',
        dob: parseDate('1962-07-01'),
        arrive_loan_number: '1250560022',
        lender_loan_number: null,
        approved_lender_id: getLenderId('SIERRA PACIFIC'),
        close_date: parseDate('2025-10-06'),
        loan_amount: parseDecimal('205000'),
        sales_price: parseDecimal('300000'),
        appraisal_value: parseDecimal('300000'),
        interest_rate: parseDecimal('7.125'),
        term: normalizeTerm('30'),
        subject_address: '6423 Collins Avenue',
        subject_address2: '#702',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33141',
        condo_name: 'Sixty-Four Twenty-Three Collins',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('68.33333333'),
        appr_ordered_date: parseDate('2025-09-06'),
        title_ordered_date: parseDate('2025-09-06'),
        hoi_quote_req_date: parseDate('2025-09-12'),
        hoi_bound_date: parseDate('2025-09-19'),
        condo_docs_ord_date: parseDate('2025-09-06'),
        condo_doc_recd_date: parseDate('2025-09-12'),
        cd_ready_date: parseDate('2025-09-26'),
        cd_sent_date: parseDate('2025-09-26'),
        cd_signed_date: parseDate('2025-10-01'),
        final_closing_pkg_sent_date: parseDate('2025-10-03'),
        last_call_date: parseDate('2025-10-18'),
        buyer_agent_id: getAgentId('Fatma', 'Serhan'),
        listing_agent_id: getAgentId('Joanne', 'Rudowski'),
        lead_on_date: parseDate('2025-08-14'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-06'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 16. Elizabeth Garcia (REFI)
      {
        first_name: 'Elizabeth',
        last_name: 'Garcia',
        email: 'elizabethgarcia0111@gmail.com',
        phone: '19544481819',
        dob: parseDate('1978-11-01'),
        arrive_loan_number: '1250654589',
        lender_loan_number: null,
        approved_lender_id: getLenderId('UWM'),
        close_date: parseDate('2025-10-09'),
        loan_amount: parseDecimal('160000'),
        sales_price: parseDecimal('400000'),
        appraisal_value: parseDecimal('400000'),
        interest_rate: parseDecimal('7.75'),
        term: normalizeTerm('30'),
        subject_address: '1101 S Ocean Drive',
        subject_address2: '#212',
        city: 'Hollywood',
        state: 'FL',
        zip: '33019',
        condo_name: 'Roney Palace',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('R'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('40'),
        appr_ordered_date: parseDate('2025-09-12'),
        title_ordered_date: parseDate('2025-09-12'),
        hoi_quote_req_date: parseDate('2025-09-13'),
        hoi_bound_date: parseDate('2025-09-25'),
        condo_docs_ord_date: parseDate('2025-09-12'),
        condo_doc_recd_date: parseDate('2025-09-17'),
        cd_ready_date: parseDate('2025-09-30'),
        cd_sent_date: parseDate('2025-10-01'),
        cd_signed_date: parseDate('2025-10-01'),
        final_closing_pkg_sent_date: parseDate('2025-10-08'),
        last_call_date: parseDate('2025-10-29'),
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-08-29'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-09'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 17. Yoseph Cetton (REFI)
      {
        first_name: 'Yoseph',
        last_name: 'Cetton',
        email: 'yosephcetton@gmail.com',
        phone: '19546000000',
        dob: parseDate('1990-10-10'),
        arrive_loan_number: '1250657123',
        lender_loan_number: null,
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-10-10'),
        loan_amount: parseDecimal('320000'),
        sales_price: parseDecimal('800000'),
        appraisal_value: parseDecimal('800000'),
        interest_rate: parseDecimal('7'),
        term: normalizeTerm('30'),
        subject_address: '2655 Collins Avenue',
        subject_address2: '#1408',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33140',
        condo_name: 'Akoya',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('R'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('40'),
        appr_ordered_date: parseDate('2025-09-16'),
        title_ordered_date: parseDate('2025-09-16'),
        hoi_quote_req_date: parseDate('2025-09-17'),
        hoi_bound_date: parseDate('2025-09-24'),
        condo_docs_ord_date: parseDate('2025-09-13'),
        condo_doc_recd_date: parseDate('2025-09-18'),
        cd_ready_date: parseDate('2025-09-30'),
        cd_sent_date: parseDate('2025-10-01'),
        cd_signed_date: parseDate('2025-10-02'),
        final_closing_pkg_sent_date: parseDate('2025-10-08'),
        last_call_date: parseDate('2025-10-28'),
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-08-30'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-10'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 18. Brant Wickersham
      {
        first_name: 'Brant',
        last_name: 'Wickersham',
        email: 'bwickersham@me.com',
        phone: '14045185518',
        dob: parseDate('1969-10-12'),
        arrive_loan_number: '1250658456',
        lender_loan_number: null,
        approved_lender_id: getLenderId('JMAC'),
        close_date: parseDate('2025-10-20'),
        loan_amount: parseDecimal('760000'),
        sales_price: parseDecimal('1090000'),
        appraisal_value: parseDecimal('1090000'),
        interest_rate: parseDecimal('7.5'),
        term: normalizeTerm('30'),
        subject_address: '17111 Biscayne Blvd',
        subject_address2: '#308',
        city: 'North Miami Beach',
        state: 'FL',
        zip: '33160',
        condo_name: 'Solimar',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('69.72477064'),
        appr_ordered_date: parseDate('2025-09-23'),
        title_ordered_date: parseDate('2025-09-23'),
        hoi_quote_req_date: parseDate('2025-09-24'),
        hoi_bound_date: parseDate('2025-10-01'),
        condo_docs_ord_date: parseDate('2025-09-20'),
        condo_doc_recd_date: parseDate('2025-09-25'),
        cd_ready_date: parseDate('2025-10-09'),
        cd_sent_date: parseDate('2025-10-09'),
        cd_signed_date: parseDate('2025-10-14'),
        final_closing_pkg_sent_date: parseDate('2025-10-17'),
        last_call_date: parseDate('2025-11-04'),
        buyer_agent_id: null,
        listing_agent_id: getAgentId('Yamile', 'Zayed'),
        lead_on_date: parseDate('2025-09-05'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-20'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 19. Eddie Colina
      {
        first_name: 'Eddie',
        last_name: 'Colina',
        email: 'eddiecolina@gmail.com',
        phone: '13059997800',
        dob: parseDate('1982-05-15'),
        arrive_loan_number: '1250659789',
        lender_loan_number: null,
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-10-30'),
        loan_amount: parseDecimal('450000'),
        sales_price: parseDecimal('600000'),
        appraisal_value: parseDecimal('600000'),
        interest_rate: parseDecimal('7.25'),
        term: normalizeTerm('30'),
        subject_address: '1000 West Avenue',
        subject_address2: '#1234',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33139',
        condo_name: 'Bentley Bay',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('75'),
        appr_ordered_date: parseDate('2025-10-01'),
        title_ordered_date: parseDate('2025-10-01'),
        hoi_quote_req_date: parseDate('2025-10-02'),
        hoi_bound_date: parseDate('2025-10-10'),
        condo_docs_ord_date: parseDate('2025-10-01'),
        condo_doc_recd_date: parseDate('2025-10-08'),
        cd_ready_date: parseDate('2025-10-18'),
        cd_sent_date: parseDate('2025-10-18'),
        cd_signed_date: parseDate('2025-10-23'),
        final_closing_pkg_sent_date: parseDate('2025-10-28'),
        last_call_date: parseDate('2025-11-08'),
        buyer_agent_id: null,
        listing_agent_id: getAgentId('Francois', 'Lopez'),
        lead_on_date: parseDate('2025-09-10'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-30'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 20. Jack Held
      {
        first_name: 'Jack',
        last_name: 'Held',
        email: 'jackheld@example.com',
        phone: '13055551234',
        dob: parseDate('1975-08-20'),
        arrive_loan_number: '1250660123',
        lender_loan_number: null,
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-10-30'),
        loan_amount: parseDecimal('380000'),
        sales_price: parseDecimal('500000'),
        appraisal_value: parseDecimal('500000'),
        interest_rate: parseDecimal('7.125'),
        term: normalizeTerm('30'),
        subject_address: '5555 Collins Avenue',
        subject_address2: '#5A',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33140',
        condo_name: 'Carillon',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('76'),
        appr_ordered_date: parseDate('2025-10-01'),
        title_ordered_date: parseDate('2025-10-01'),
        hoi_quote_req_date: parseDate('2025-10-02'),
        hoi_bound_date: parseDate('2025-10-10'),
        condo_docs_ord_date: parseDate('2025-10-01'),
        condo_doc_recd_date: parseDate('2025-10-07'),
        cd_ready_date: parseDate('2025-10-18'),
        cd_sent_date: parseDate('2025-10-18'),
        cd_signed_date: parseDate('2025-10-23'),
        final_closing_pkg_sent_date: parseDate('2025-10-28'),
        last_call_date: null,
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-09-12'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-30'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 21. Muge Ozdemir
      {
        first_name: 'Muge',
        last_name: 'Ozdemir',
        email: 'mugeozdemir@gmail.com',
        phone: '13055552345',
        dob: parseDate('1985-03-10'),
        arrive_loan_number: '1250661234',
        lender_loan_number: null,
        approved_lender_id: getLenderId('A&D'),
        close_date: parseDate('2025-10-31'),
        loan_amount: parseDecimal('420000'),
        sales_price: parseDecimal('550000'),
        appraisal_value: parseDecimal('550000'),
        interest_rate: parseDecimal('7'),
        term: normalizeTerm('30'),
        subject_address: '3400 SW 27th Avenue',
        subject_address2: '#1202',
        city: 'Miami',
        state: 'FL',
        zip: '33133',
        condo_name: 'Grove at Grand Bay',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('76.36363636'),
        appr_ordered_date: parseDate('2025-10-02'),
        title_ordered_date: parseDate('2025-10-02'),
        hoi_quote_req_date: parseDate('2025-10-03'),
        hoi_bound_date: parseDate('2025-10-11'),
        condo_docs_ord_date: parseDate('2025-10-02'),
        condo_doc_recd_date: parseDate('2025-10-09'),
        cd_ready_date: parseDate('2025-10-19'),
        cd_sent_date: parseDate('2025-10-19'),
        cd_signed_date: parseDate('2025-10-24'),
        final_closing_pkg_sent_date: parseDate('2025-10-29'),
        last_call_date: null,
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-09-15'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-10-31'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
      // 22. Tatiana Gracheva
      {
        first_name: 'Tatiana',
        last_name: 'Gracheva',
        email: 'tatianagracheva@gmail.com',
        phone: '13055553456',
        dob: parseDate('1992-09-25'),
        arrive_loan_number: '1250662345',
        lender_loan_number: null,
        approved_lender_id: null,
        close_date: parseDate('2025-11-03'),
        loan_amount: parseDecimal('360000'),
        sales_price: parseDecimal('480000'),
        appraisal_value: parseDecimal('480000'),
        interest_rate: parseDecimal('7.25'),
        term: normalizeTerm('30'),
        subject_address: '6800 Indian Creek Drive',
        subject_address2: '#8B',
        city: 'Miami Beach',
        state: 'FL',
        zip: '33141',
        condo_name: 'Mimosa',
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        pr_type: mapPrType('P'),
        condo_status: mapCondoStatus('APPROVED'),
        ltv: parseDecimal('75'),
        appr_ordered_date: parseDate('2025-10-05'),
        title_ordered_date: parseDate('2025-10-05'),
        hoi_quote_req_date: parseDate('2025-10-06'),
        hoi_bound_date: parseDate('2025-10-14'),
        condo_docs_ord_date: parseDate('2025-10-05'),
        condo_doc_recd_date: parseDate('2025-10-12'),
        cd_ready_date: parseDate('2025-10-22'),
        cd_sent_date: parseDate('2025-10-22'),
        cd_signed_date: parseDate('2025-10-28'),
        final_closing_pkg_sent_date: parseDate('2025-11-01'),
        last_call_date: null,
        buyer_agent_id: null,
        listing_agent_id: null,
        lead_on_date: parseDate('2025-09-18'),
        pending_app_at: null,
        app_complete_at: null,
        pre_approved_at: null,
        active_at: null,
        closed_at: parseDate('2025-11-03'),
        is_closed: true,
        pipeline_stage_id: pastClientsPipelineStageId,
        account_id: defaultAccountId,
        created_by: defaultUserId,
        escrows: null,
      },
    ];

    // PREVIEW / APPLY logic
    if (!isApplyMode) {
      return new Response(
        JSON.stringify({
          mode: 'PREVIEW',
          lenders_to_create: newLenders.length,
          agents_to_create: newAgents.length,
          leads_to_insert: pastClientsData.length,
          message: 'Preview mode: No changes made. Call with {"confirm": true} to apply.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // APPLY MODE: Delete existing past clients
    const { data: existingLeads } = await supabase
      .from('leads')
      .select('id')
      .eq('pipeline_stage_id', pastClientsPipelineStageId);

    let deletedCount = 0;
    if (existingLeads && existingLeads.length > 0) {
      const leadIds = existingLeads.map(l => l.id);

      // Delete dependent records
      await supabase.from('borrowers').delete().in('lead_id', leadIds);
      await supabase.from('tasks').delete().in('lead_id', leadIds);

      // Delete leads
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', leadIds);

      if (deleteError) {
        throw new Error(`Failed to delete existing leads: ${deleteError.message}`);
      }
      deletedCount = leadIds.length;
      console.log(`Deleted ${deletedCount} existing Past Clients leads`);
    }

    // Insert new leads
    let insertedCount = 0;
    const errors: any[] = [];

    for (const lead of pastClientsData) {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select();

      if (error) {
        console.error(`Failed to insert lead ${lead.first_name} ${lead.last_name}:`, error);
        errors.push({ lead: `${lead.first_name} ${lead.last_name}`, error: error.message });
      } else {
        insertedCount++;
        console.log(`✓ Inserted: ${lead.first_name} ${lead.last_name}`);
      }
    }

    return new Response(
      JSON.stringify({
        mode: 'APPLY',
        lenders_created: createdLenders.length,
        agents_created: createdAgents.length,
        leads_deleted: deletedCount,
        leads_inserted: insertedCount,
        errors: errors.length > 0 ? errors : null,
        message: `Successfully migrated ${insertedCount} Past Clients`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
