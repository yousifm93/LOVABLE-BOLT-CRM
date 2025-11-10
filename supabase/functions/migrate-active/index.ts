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

// Map status values to valid enum values
function mapAppraisalStatus(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'ORDERED': 'Ordered',
    'SCHEDULED': 'Scheduled',
    'INSPECTED': 'Inspected',
    'RECEIVED': 'Received',
    'WAIVER': 'Waiver',
  };
  return map[upper] || null;
}

function mapTitleStatus(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'REQUESTED': 'Requested',
    'RECEIVED': 'Received',
  };
  return map[upper] || null;
}

function mapHoiStatus(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'QUOTED': 'Quoted',
    'ORDERED': 'Ordered',
    'RECEIVED': 'Received',
  };
  return map[upper] || null;
}

function mapCondoStatus(value: string | null): string | null {
  if (!value || value === 'N/A') return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'ORDERED': 'Ordered',
    'RECEIVED': 'Received',
    'APPROVED': 'Approved',
  };
  return map[upper] || null;
}

function mapDisclosureStatus(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'ORDERED': 'Ordered',
    'SENT': 'Sent',
    'SIGNED': 'Signed',
    'NEED SIGNATURE': 'Need Signature',
  };
  return map[upper] || null;
}

function mapLoanStatus(value: string | null): string | null {
  if (!value) return null;
  // loan_status has some uppercase values in the enum
  const validValues = ['NEW', 'RFP', 'SUV', 'AWC', 'CTC', 'New RFP', 'New', 'SUB'];
  return validValues.includes(value) ? value : null;
}

// Map pr_type values to valid enum values
function mapPrType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'PURCHASE': 'P',
    'P': 'P',
    'REFINANCE': 'R',
    'R': 'R',
    'HELOC': 'HELOC',
  };
  return map[upper] || null;
}

// Map occupancy values to valid enum values
function mapOccupancy(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'PRIMARY': 'Primary Residence',
    'PRIMARY RESIDENCE': 'Primary Residence',
    'PRIMARYRESIDENCE': 'Primary Residence',
    'INVESTMENT': 'Investment Property',
    'INVESTMENT PROPERTY': 'Investment Property',
    'SECOND HOME': 'Second Home',
  };
  return map[upper] || null;
}

// Map property type values to valid enum values
function mapPropertyType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  const map: Record<string, string> = {
    'CONDO': 'Condo',
    'CONDOMINIUM': 'Condo',
    'SFR': 'Single Family',
    'SINGLEFAMILY': 'Single Family',
    'SINGLE FAMILY': 'Single Family',
    'TOWNHOUSE': 'Townhouse',
    'TOWNHOME': 'Townhouse',
    'MULTI-FAMILY': 'Multi-Family',
  };
  return map[upper] || 'Condo'; // Default to Condo if unmapped
}

// Normalize term (convert years to months if needed)
function normalizeTerm(value: any): number | null {
  if (!value || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return null;
  // If value is <= 50, assume it's in years and convert to months
  if (num <= 50) return num * 12;
  return num;
}

// Map escrows from "YES"/"NO" or "ESCROW WAIVED?"
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

    // Step 6: Define new buyer agents to create (including agents from INCOMING)
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
      { first_name: 'Teresa', last_name: 'Garcia', brokerage: 'Unknown Brokerage' },
      { first_name: 'Evan', last_name: 'Schechtman', brokerage: 'Unknown Brokerage' },
      { first_name: 'Monserrat', last_name: 'Cardoso', brokerage: 'Unknown Brokerage' },
      { first_name: 'Adriana', last_name: 'Faerman', brokerage: 'Unknown Brokerage' },
      { first_name: 'Josefina', last_name: 'Coviello', brokerage: 'Unknown Brokerage' },
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
      { lender_name: 'PennyMac Loan Services, LLC' },
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

    // Step 9: Helper to get lender ID (with Excel name mapping)
    function getLenderId(lenderName: string): string | null {
      if (!lenderName) return null;
      
      // Map short names from Excel to full lender names
      const lenderMap: Record<string, string> = {
        'A&D': 'A&D MORTGAGE LLC',
        'DEEPHAVEN': 'Deephaven Mortgage LLC',
        'CHAMPIONS FUNDING': 'Champions Funding LLC',
        'PENNYMAC': 'PennyMac Loan Services, LLC',
      };
      
      const fullName = lenderMap[lenderName.toUpperCase()] || lenderName;
      const key = fullName.toLowerCase();
      return existingLenderMap.get(key) || null;
    }

    // Step 10: Define all 21 Active leads (19 LIVE + 2 INCOMING) with comprehensive data from Excel
    const defaultAccountId = '47e707c5-62d0-4ee9-99a3-76572c73a8e1'; // Default account for all leads
    const defaultUserId = '08e73d69-4707-4773-84a4-69ce2acd6a11'; // Default user for created_by
    
    const activeLeads = [
      // LIVE Lead 1: Daniel Roubeni
      {
        first_name: 'Daniel',
        last_name: 'Roubeni',
        email: 'droubeni@dansoni.com',
        phone: '9178555502',
        dob: parseDate('1968-09-17'),
        borrower_current_address: '2 Twin Ponds Street Kings Point, NY 11024',
        lead_on_date: parseDate('2025-09-11'),
        active_at: parseDate('2025-09-23'),
        close_date: parseDate('2025-11-14'),
        lock_expiration_date: parseDate('2025-11-20'),
        arrive_loan_number: 15048017,
        loan_amount: parseDecimal('337500'),
        sales_price: parseDecimal('675000'),
        interest_rate: parseDecimal('6.49'),
        term: normalizeTerm(360),
        piti: parseDecimal('937.5'),
        program: 'Conventional',
        pr_type: mapPrType('R'),
        estimated_fico: parseFico('752'),
        escrows: mapEscrows('YES'),
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '100 Lincoln Road',
        subject_address_2: '921',
        subject_city: 'Miami Beach',
        subject_state: 'FL',
        subject_zip: '33139',
        condo_name: 'Decoplage',
        appraisal_value: '725000',
        appr_date_time: parseDate('2025-09-24 12:00'),
        appr_eta: parseDate('2025-09-30'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-09-22'),
        buyer_agent_id: null, // REFI
        listing_agent_id: null, // REFI
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 2: Nancy Peixoto
      {
        first_name: 'Nancy',
        last_name: 'Peixoto',
        email: 'nancy_peixoto@icloud.com',
        phone: '6452142131',
        dob: parseDate('1989-12-03'),
        borrower_current_address: '325 s biscayne blvd',
        lead_on_date: parseDate('2025-10-02'),
        pending_app_at: parseDate('2025-10-02'),
        app_complete_at: parseDate('2025-10-02'),
        pre_approved_at: parseDate('2025-10-03'),
        active_at: parseDate('2025-10-08'),
        close_date: parseDate('2025-11-17'),
        lock_expiration_date: parseDate('2025-11-20'),
        arrive_loan_number: 15191857,
        loan_amount: parseDecimal('360000'),
        sales_price: parseDecimal('630000'),
        down_pmt: parseDecimal('240000'),
        interest_rate: parseDecimal('6.625'),
        term: normalizeTerm(30),
        piti: parseDecimal('4333'),
        loan_type: 'Conventional',
        program: 'Conventional',
        pr_type: mapPrType('P'),
        income_type: 'S/E',
        estimated_fico: parseFico('770'),
        total_monthly_income: parseDecimal('7330'),
        monthly_liabilities: parseDecimal('106'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        subject_address_1: '888 Biscayne Blvd',
        subject_address_2: '#4106',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33132',
        condo_name: 'Marina Blue',
        appraisal_value: '620000',
        appr_date_time: parseDate('2025-10-22 14:00'),
        appr_eta: parseDate('2025-10-24'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('CTC'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('APPROVED'),
        title_ordered_date: parseDate('2025-10-07'),
        buyer_agent_id: getAgentId('Silvy', 'Souza'), // Silvia
        listing_agent_id: getAgentId('Joaquin', 'Leon'),
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 3: Dominic Medina
      {
        first_name: 'Dominic',
        last_name: 'Medina',
        email: 'medinadominic@gmail.com',
        phone: '16469780918',
        dob: parseDate('1995-12-16'),
        borrower_current_address: '86 Southwest 8th Street # 1707, Miami, FL 33130, USA',
        lead_on_date: parseDate('2025-10-08'),
        active_at: parseDate('2025-10-22'),
        close_date: parseDate('2025-11-17'),
        arrive_loan_number: 15230039,
        loan_amount: parseDecimal('328000'),
        sales_price: parseDecimal('410000'),
        down_pmt: parseDecimal('82000'),
        interest_rate: null,
        term: normalizeTerm(360),
        piti: parseDecimal('0'),
        program: 'Conventional',
        pr_type: mapPrType('P'),
        estimated_fico: parseFico('780'),
        total_monthly_income: parseDecimal('15116.67'),
        monthly_liabilities: parseDecimal('706'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        subject_address_1: '690 Southwest 1st Court',
        subject_address_2: '1006',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33130',
        condo_name: 'Neo Vertika',
        appraisal_value: null,
        fin_cont: parseDate('2025-10-31'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('RECEIVED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('WAIVER'),
        condo_status: mapCondoStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-10-22'),
        buyer_agent_id: getAgentId('Tatiana', 'Rodriguez'),
        listing_agent_id: getAgentId('Alireza', 'Naghdian'),
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 4: Diana Alzate
      {
        first_name: 'Diana',
        last_name: 'Alzate',
        email: 'dalzate@hotmail.com',
        phone: '7866319846',
        dob: parseDate('1968-01-19'),
        borrower_current_address: '855 Bayside Lane, Weston, FL 33326, USA',
        lead_on_date: parseDate('2025-09-15'),
        pending_app_at: parseDate('2025-09-24'),
        app_complete_at: parseDate('2025-10-05'),
        pre_qualified_at: parseDate('2025-10-06'),
        active_at: parseDate('2025-10-10'),
        close_date: parseDate('2025-11-18'),
        arrive_loan_number: 15173011,
        loan_amount: parseDecimal('183750'),
        sales_price: parseDecimal('262500'),
        down_pmt: parseDecimal('78750'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('2141.04'),
        loan_type: 'Conventional',
        program: 'Conventional',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('733'),
        monthly_liabilities: parseDecimal('3163'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '100 Lincoln Road',
        subject_address_2: '#304',
        subject_city: 'Miami Beach',
        subject_state: 'FL',
        subject_zip: '33139',
        condo_name: 'Decoplage',
        appraisal_value: null,
        appr_date_time: parseDate('2025-11-01 09:00'),
        appr_eta: parseDate('2025-11-05'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('RECEIVED'),
        hoi_status: mapHoiStatus('ORDERED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-10-13'),
        title_eta: parseDate('2025-09-24'),
        buyer_agent_id: getAgentId('Jackeline', 'Londono'),
        listing_agent_id: getAgentId('Patricia', 'Rapan'),
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 5: Jackeline Londono
      {
        first_name: 'Jackeline',
        last_name: 'Londono',
        email: 'jlondono@morganwhitney.com',
        phone: '3053453738',
        dob: parseDate('1966-11-02'),
        borrower_current_address: '628 Aledo Avenue, Coral Gables, FL 33134, USA',
        lead_on_date: parseDate('2025-10-01'),
        active_at: parseDate('2025-10-30'),
        close_date: parseDate('2025-11-19'),
        lock_expiration_date: parseDate('2025-11-21'),
        arrive_loan_number: 15129091,
        loan_amount: parseDecimal('269500'),
        sales_price: parseDecimal('350000'),
        interest_rate: parseDecimal('7.375'),
        term: normalizeTerm(360),
        piti: parseDecimal('2587.81'),
        program: 'Non-QM',
        pr_type: mapPrType('R'),
        estimated_fico: parseFico('698'),
        monthly_liabilities: parseDecimal('0'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '100 Lincoln Road',
        subject_address_2: '1609',
        subject_city: 'Miami Beach',
        subject_state: 'FL',
        subject_zip: '33139',
        condo_name: 'Decoplage',
        appraisal_value: '330000',
        appr_date_time: parseDate('2025-10-31 09:00'),
        appr_eta: parseDate('2025-11-05'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('ORDERED'),
        appraisal_status: null, // REBUTTAL
        title_ordered_date: parseDate('2025-10-30'),
        buyer_agent_id: null, // REFI
        listing_agent_id: null, // REFI
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 6: Jordan Ramos / Rayza Occelli
      {
        first_name: 'Rayza',
        last_name: 'Occelli', // Using second borrower as primary
        email: 'rayza_occelli@hotmail.com',
        phone: '3059157423',
        dob: parseDate('1991-02-23'),
        borrower_current_address: '1001 Northwest 7th Street',
        lead_on_date: parseDate('2025-08-12'),
        pending_app_at: parseDate('2025-08-12'),
        app_complete_at: parseDate('2025-09-14'),
        pre_qualified_at: parseDate('2025-09-19'),
        pre_approved_at: parseDate('2025-10-03'),
        active_at: parseDate('2025-10-09'),
        close_date: parseDate('2025-11-21'),
        arrive_loan_number: 15062626,
        loan_amount: parseDecimal('261540'),
        sales_price: parseDecimal('435900'),
        down_pmt: parseDecimal('174360'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('1651.39'),
        program: 'DSCR',
        pr_type: mapPrType('P'),
        estimated_fico: parseFico('620'),
        monthly_liabilities: parseDecimal('207'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '225 Miami Avenue',
        subject_address_2: '3008',
        subject_city: 'Miami',
        subject_state: 'FL',
        condo_name: 'District 25',
        appraisal_value: null,
        appr_date_time: parseDate('2025-10-22 12:00'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: null, // SCHEDULED
        title_ordered_date: null,
        buyer_agent_id: getAgentId('Andre', 'Martins'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 7: Dario Occelli Jr
      {
        first_name: 'Dario',
        last_name: 'Occelli',
        email: 'dario.occellijr@gmail.com',
        phone: '3059043378',
        dob: parseDate('2002-05-21'),
        borrower_current_address: null,
        lead_on_date: parseDate('2025-08-11'),
        pending_app_at: parseDate('2025-08-12'),
        app_complete_at: parseDate('2025-08-14'),
        pre_qualified_at: parseDate('2025-08-18'),
        active_at: parseDate('2025-09-05'),
        close_date: parseDate('2025-11-21'),
        arrive_loan_number: 14850437,
        loan_amount: parseDecimal('254340'),
        sales_price: parseDecimal('423900'),
        down_pmt: parseDecimal('169560'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('0'),
        program: 'Non-QM',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('750'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '225 North Miami Avenue',
        subject_address_2: '# 2408',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33128',
        condo_name: 'District 25',
        appraisal_value: '445000',
        appr_date_time: parseDate('2025-09-26 13:30'),
        appr_eta: parseDate('2025-10-03'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: null, // ON HOLD
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-08-12'),
        buyer_agent_id: getAgentId('Andre', 'Martins'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 8: Yoseph Cetton (2)
      {
        first_name: 'Yoseph',
        last_name: 'Cetton',
        email: 'flduct@gmail.com',
        phone: '19545137777',
        dob: parseDate('1962-03-17'),
        borrower_current_address: null,
        lead_on_date: parseDate('2025-05-23'),
        active_at: null,
        close_date: parseDate('2025-11-21'),
        arrive_loan_number: 14548295,
        loan_amount: parseDecimal('175000'),
        sales_price: null,
        interest_rate: null,
        term: null,
        piti: parseDecimal('18007'),
        program: null,
        pr_type: mapPrType('R'),
        estimated_fico: parseFico('740'),
        monthly_liabilities: parseDecimal('9186'),
        escrows: null,
        property_type: mapPropertyType('SFR'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '7980 North Nob Hill Road',
        subject_address_2: '203',
        subject_city: 'Tamarac',
        subject_state: 'FL',
        subject_zip: '33321',
        condo_name: 'EL-AD NOB HILL',
        appraisal_value: '248000',
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('RECEIVED'),
        hoi_status: mapHoiStatus('ORDERED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-10-23'),
        buyer_agent_id: null, // REFI
        listing_agent_id: null, // REFI
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 9: Geetha Sankuratri
      {
        first_name: 'Geetha',
        last_name: 'Samkuratri', // Misspelling from Excel "Sankuratri"
        email: 'gsankur@gmail.com',
        phone: '14693468607',
        dob: parseDate('1972-06-09'),
        borrower_current_address: '536 S Pearl Expy Dallas, TX. 75201',
        lead_on_date: parseDate('2025-01-07'),
        pending_app_at: parseDate('2025-07-31'),
        app_complete_at: parseDate('2025-07-31'),
        pre_qualified_at: parseDate('2025-08-07'),
        active_at: parseDate('2025-08-19'),
        close_date: parseDate('2025-11-25'),
        arrive_loan_number: 14759707,
        loan_amount: parseDecimal('421740'),
        sales_price: parseDecimal('702900'),
        down_pmt: parseDecimal('280800'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('5369.43'),
        loan_type: 'CONVENTONAL',
        program: 'CONVENTONAL',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('780'),
        total_monthly_income: parseDecimal('28166.67'),
        monthly_liabilities: parseDecimal('0'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '225 North Miami Avenue',
        subject_address_2: '#1405',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33128',
        condo_name: 'District 25',
        appraisal_value: '660000',
        appr_eta: null,
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-11-05'),
        title_eta: parseDate('2025-07-31'),
        buyer_agent_id: getAgentId('Andre', 'Martins'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('DEEPHAVEN'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 10: Anil Potluri
      {
        first_name: 'Anil',
        last_name: 'Potluri',
        email: 'pvanil@yahoo.com',
        phone: '18608697020',
        dob: parseDate('1973-08-15'),
        borrower_current_address: '17 Hibiscus Way, Nashua, NH 03062, USA',
        lead_on_date: parseDate('2025-02-14'),
        pending_app_at: parseDate('2025-07-30'),
        app_complete_at: parseDate('2025-07-30'),
        pre_qualified_at: parseDate('2025-08-05'),
        active_at: parseDate('2025-09-03'),
        close_date: parseDate('2025-11-26'),
        arrive_loan_number: 14752473,
        loan_amount: parseDecimal('400140'),
        sales_price: parseDecimal('666900'),
        down_pmt: parseDecimal('266760'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('5134.45'),
        loan_type: 'CONVENTONAL',
        program: 'CONVENTONAL',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('780'),
        total_monthly_income: parseDecimal('12916.67'),
        monthly_liabilities: parseDecimal('1000'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '225 N Miami Avenue',
        subject_address_2: '#2012',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33128',
        condo_name: 'District 25',
        appraisal_value: '730000',
        appr_date_time: parseDate('2025-09-12 17:57'),
        fin_cont: parseDate('2022-12-31'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-11-10'),
        title_eta: parseDate('2025-07-30'),
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 11: Eunice Maria Giraldo
      {
        first_name: 'Eunice',
        last_name: 'Giraldo',
        email: 'mariaegiraldo56@gmail.com',
        phone: '19548950356',
        dob: parseDate('1956-04-03'),
        borrower_current_address: '2808 SW natura Blvd',
        lead_on_date: parseDate('2025-10-09'),
        pending_app_at: parseDate('2025-10-14'),
        app_complete_at: parseDate('2025-10-10'),
        pre_qualified_at: parseDate('2025-10-14'),
        pre_approved_at: parseDate('2025-10-15'),
        active_at: parseDate('2025-10-27'),
        close_date: parseDate('2025-11-28'),
        arrive_loan_number: 15243033,
        loan_amount: parseDecimal('104000'),
        sales_price: parseDecimal('130000'),
        down_pmt: parseDecimal('32500'),
        interest_rate: parseDecimal('8.75'),
        term: normalizeTerm(360),
        piti: parseDecimal('1581.32'),
        program: 'Non-QM',
        pr_type: mapPrType('P'),
        income_type: 'NON QM',
        estimated_fico: parseFico('809'),
        total_monthly_income: parseDecimal('1035'),
        monthly_liabilities: parseDecimal('100'),
        escrows: mapEscrows('NO'),
        property_type: mapPropertyType('SingleFamily'),
        occupancy: mapOccupancy('PRIMARY'),
        subject_address_1: '2801 SW Natura Blvd',
        subject_address_2: 'D',
        subject_city: 'Deerfield Beach',
        subject_state: 'FL',
        subject_zip: '33441',
        condo_name: null,
        appraisal_value: '150000',
        appr_date_time: parseDate('2025-11-03 09:00'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('RECEIVED'),
        hoi_status: mapHoiStatus('ORDERED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: null, // N/A
        title_ordered_date: parseDate('2025-10-28'),
        title_eta: parseDate('2025-10-31'),
        buyer_agent_id: getAgentId('Teresa', 'Garcia'),
        listing_agent_id: getAgentId('Brett', 'Roy'),
        approved_lender_id: getLenderId('CHAMPIONS FUNDING'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 12: Sheela Vallabhaneni
      {
        first_name: 'Sheela',
        last_name: 'Vallabhaneni',
        email: 'sheelavallabhaneni@gmail.com',
        phone: '5132897381',
        dob: parseDate('1974-06-29'),
        borrower_current_address: '12181 Compassplant Drive, Frisco, TX 75035, USA',
        lead_on_date: parseDate('2025-07-31'),
        pending_app_at: parseDate('2025-07-31'),
        app_complete_at: parseDate('2025-08-03'),
        pre_qualified_at: parseDate('2025-08-06'),
        active_at: parseDate('2025-08-19'),
        close_date: parseDate('2025-12-02'),
        arrive_loan_number: 14772662,
        loan_amount: parseDecimal('397140'),
        sales_price: parseDecimal('661900'),
        down_pmt: parseDecimal('264760'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('5411.52'),
        loan_type: 'Conventional',
        program: 'Conventional',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('734'),
        total_monthly_income: parseDecimal('32933.33'),
        monthly_liabilities: parseDecimal('6899'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '225 North Miami Avenue',
        subject_address_2: '#1501',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33128',
        condo_name: 'District 25',
        appraisal_value: '675000',
        appr_date_time: parseDate('2025-10-24 13:00'),
        appr_eta: parseDate('2025-10-30'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-11-05'),
        title_eta: parseDate('2025-07-31'),
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('DEEPHAVEN'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 13: Sheela - Crosby
      {
        first_name: 'Sheela',
        last_name: 'Vallabhaneni', // Same person as lead 12, different property
        email: 'sheelavallabhaneni@gmail.com',
        phone: '5132897381',
        dob: parseDate('1974-06-29'),
        borrower_current_address: '12181 Compassplant Drive',
        lead_on_date: parseDate('2025-09-18'),
        pending_app_at: parseDate('2025-09-18'),
        app_complete_at: parseDate('2025-09-19'),
        pre_approved_at: parseDate('2025-09-19'),
        active_at: parseDate('2025-09-24'),
        close_date: parseDate('2025-12-04'),
        arrive_loan_number: 15107908,
        loan_amount: parseDecimal('292800'),
        sales_price: parseDecimal('488000'),
        down_pmt: parseDecimal('195200'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('3281.50'),
        program: null,
        pr_type: mapPrType('P'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '698 NE 1st Avenue',
        subject_address_2: '2104',
        subject_city: 'Miami',
        subject_state: 'FL',
        condo_name: 'Crosby',
        appraisal_value: null,
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: null, // ON HOLD
        condo_status: mapCondoStatus('ORDERED'),
        title_ordered_date: parseDate('2025-11-06'),
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 14: Alejandro Rasic
      {
        first_name: 'Alejandro',
        last_name: 'Rasic',
        email: 'alerasic@gmail.com',
        phone: '17867952224',
        dob: parseDate('1972-12-09'),
        borrower_current_address: '1000 Brickell Plaza, Miami, FL 33131, USA',
        lead_on_date: parseDate('2025-07-23'),
        active_at: parseDate('2025-09-17'),
        close_date: parseDate('2025-12-05'),
        arrive_loan_number: 14712194,
        loan_amount: parseDecimal('266000'),
        sales_price: parseDecimal('532000'),
        down_pmt: parseDecimal('266000'),
        interest_rate: null,
        term: normalizeTerm(360),
        piti: parseDecimal('4073'),
        loan_type: 'CONVENTONAL',
        program: 'CONVENTONAL',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: null,
        total_monthly_income: parseDecimal('29832'),
        monthly_liabilities: parseDecimal('750'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '90 Northeast 32nd Street',
        subject_address_2: '1118',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33127',
        condo_name: 'The Standard',
        appraisal_value: null,
        fin_cont: parseDate('2023-06-30'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: null, // ON HOLD
        appraisal_status: null, // ON HOLD
        condo_status: null, // ON HOLD
        title_ordered_date: parseDate('2025-09-18'),
        buyer_agent_id: null, // Missing in Excel
        listing_agent_id: getAgentId('Ramon', 'Rodriguez'),
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 15: Nicholas Burchill
      {
        first_name: 'Nicholas',
        last_name: 'Burchill',
        email: 'nicholasburchill@gmail.com',
        phone: '12032869775',
        dob: null,
        borrower_current_address: null,
        lead_on_date: parseDate('2025-09-30'),
        pending_app_at: parseDate('2025-10-01'),
        app_complete_at: parseDate('2025-10-01'),
        pre_qualified_at: parseDate('2025-10-15'),
        active_at: parseDate('2025-11-04'),
        close_date: parseDate('2025-12-08'),
        arrive_loan_number: 15181642,
        loan_amount: parseDecimal('325600'),
        sales_price: parseDecimal('407000'),
        down_pmt: parseDecimal('20000'),
        interest_rate: parseDecimal('10.375'),
        term: null,
        piti: parseDecimal('4050'),
        loan_type: 'Conventional',
        program: 'Conventional',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('766'),
        monthly_liabilities: parseDecimal('65'),
        escrows: mapEscrows('NO'),
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PrimaryResidence'),
        subject_address_1: '60 SW 13th St',
        subject_address_2: null,
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33130',
        condo_name: 'Infinity At Brickell',
        appraisal_value: null,
        fin_cont: parseDate('2025-12-01'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        appraisal_status: mapAppraisalStatus('ORDERED'),
        condo_status: mapCondoStatus('ORDERED'),
        title_ordered_date: parseDate('2025-11-07'),
        title_eta: parseDate('2025-10-01'),
        buyer_agent_id: getAgentId('Khloe', 'Guerra'),
        listing_agent_id: getAgentId('Sarah', 'Desamours'),
        approved_lender_id: getLenderId('CHAMPIONS FUNDING'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 16: Myles Munroe
      {
        first_name: 'Myles',
        last_name: 'Munroe',
        email: null,
        phone: '12423766990',
        dob: parseDate('1984-01-11'),
        borrower_current_address: '36 Concord Drive, Nassau, PO Box CB13070, Bahamas',
        lead_on_date: parseDate('2025-01-15'),
        pre_approved_at: parseDate('2025-03-13'),
        active_at: parseDate('2025-07-10'),
        close_date: parseDate('2025-12-10'),
        arrive_loan_number: 13623776,
        loan_amount: parseDecimal('611100'),
        sales_price: parseDecimal('873000'),
        down_pmt: parseDecimal('261900'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('1701.39'),
        program: null,
        pr_type: mapPrType('P'),
        estimated_fico: parseFico('740'),
        total_monthly_income: parseDecimal('45416.67'),
        monthly_liabilities: parseDecimal('0'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '697 N Miami Avenue',
        subject_address_2: '3308',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33132',
        condo_name: 'Flow House',
        appraisal_value: '873000',
        appr_date_time: parseDate('2025-10-23 09:00'),
        appr_eta: parseDate('2025-10-27'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        appraisal_status: mapAppraisalStatus('RECEIVED'),
        condo_status: mapCondoStatus('ORDERED'),
        title_ordered_date: parseDate('2025-10-14'),
        buyer_agent_id: getAgentId('Evan', 'Schechtman'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 17: Rahul Kommineni/ Geetha Sankur
      {
        first_name: 'Rahul',
        last_name: 'Kommineni',
        email: 'rahul.kommineni@gmail.com',
        phone: '3145375952',
        dob: parseDate('1974-03-08'),
        borrower_current_address: '7004 Seminary Ridge Court',
        lead_on_date: parseDate('2025-09-09'),
        pending_app_at: parseDate('2025-09-12'),
        app_complete_at: parseDate('2025-09-11'),
        pre_approved_at: parseDate('2025-09-23'),
        active_at: parseDate('2025-09-26'),
        close_date: parseDate('2025-12-11'),
        arrive_loan_number: 15046363,
        loan_amount: parseDecimal('411600'),
        sales_price: parseDecimal('686000'),
        down_pmt: parseDecimal('274400'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('2810.62'),
        program: 'Non-QM',
        pr_type: mapPrType('P'),
        income_type: 'NON QM',
        estimated_fico: parseFico('780'),
        total_monthly_income: parseDecimal('41918'),
        monthly_liabilities: parseDecimal('6112'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '698 Northeast 1st Avenue',
        subject_address_2: '1609',
        subject_city: 'Miami',
        subject_state: 'FL',
        condo_name: 'Crosby',
        appraisal_value: null,
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: null, // ON HOLD
        appraisal_status: null, // ON HOLD
        condo_status: mapCondoStatus('ORDERED'),
        title_ordered_date: null,
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 18: Sundeep Sayapneni
      {
        first_name: 'Sundeep',
        last_name: 'Sayapneni',
        email: 'sundeep.meher@gmail.com',
        phone: '5624536124',
        dob: parseDate('1988-07-31'),
        borrower_current_address: '2937 Count Fleet Way, Celina, TX 75009, USA',
        lead_on_date: parseDate('2025-09-08'),
        active_at: parseDate('2025-10-28'),
        close_date: parseDate('2026-01-09'),
        arrive_loan_number: 15016858,
        loan_amount: parseDecimal('276000'),
        sales_price: parseDecimal('460000'),
        down_pmt: parseDecimal('184000'),
        interest_rate: null,
        term: normalizeTerm(360),
        piti: parseDecimal('3118'),
        program: 'DSCR',
        pr_type: mapPrType('P'),
        income_type: 'DSCR',
        estimated_fico: parseFico('789'),
        total_monthly_income: parseDecimal('14416.67'),
        monthly_liabilities: parseDecimal('1000'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('INVESTMENT'),
        subject_address_1: '698 Northeast 1st Avenue',
        subject_address_2: '910',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33132',
        condo_name: 'The Crosby',
        appraisal_value: null,
        appr_date_time: parseDate('2025-11-11 09:00'),
        appr_eta: parseDate('2025-11-13'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('AWC'),
        title_status: null, // ON HOLD
        appraisal_status: null, // SCHEDULED
        condo_status: null, // ON HOLD
        title_ordered_date: null,
        buyer_agent_id: getAgentId('Karen', 'Elmir'),
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // LIVE Lead 19: Pallavi Reddy
      {
        first_name: 'Pallavi Reddy',
        last_name: 'Rayapu',
        email: 'pallavirayapu@gmail.com',
        phone: '5133441836',
        dob: parseDate('1987-06-26'),
        borrower_current_address: '5999 Maxfli Lane, Mason, OH 45040, USA',
        lead_on_date: parseDate('2025-09-18'),
        pending_app_at: parseDate('2025-09-23'),
        app_complete_at: parseDate('2025-09-24'),
        pre_qualified_at: parseDate('2025-09-25'),
        active_at: parseDate('2025-11-10'),
        close_date: parseDate('2025-12-05'),
        arrive_loan_number: 15135797,
        loan_amount: parseDecimal('301200'),
        sales_price: parseDecimal('502000'),
        down_pmt: parseDecimal('200800'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('3406.18'),
        program: 'NonQM',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('792'),
        total_monthly_income: parseDecimal('10583'),
        monthly_liabilities: parseDecimal('1000'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('Investment'),
        subject_address_1: '601 North Miami Avenue',
        subject_address_2: '#2005',
        subject_city: 'Miami',
        subject_state: 'FL',
        subject_zip: '33132',
        condo_name: 'The Crosby',
        appraisal_value: null,
        fin_cont: parseDate('2025-12-05'),
        disclosure_status: mapDisclosureStatus('SENT'),
        loan_status: mapLoanStatus('SUB'),
        condo_status: null, // PENDING ORDER
        title_ordered_date: parseDate('2025-09-23'),
        buyer_agent_id: null,
        listing_agent_id: null,
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // INCOMING Lead 20: Daniel Faltas
      {
        first_name: 'Daniel',
        last_name: 'Faltas',
        email: null,
        phone: '18482199757',
        dob: parseDate('1976-09-20'),
        borrower_current_address: '200 Leslie Drive UNIT 606 Hallandale Beach FL 33009',
        lead_on_date: parseDate('2025-02-24'),
        pending_app_at: parseDate('2025-02-27'),
        app_complete_at: parseDate('2025-03-07'),
        active_at: parseDate('2025-03-17'),
        close_date: parseDate('2025-11-21'),
        arrive_loan_number: 13869119,
        loan_amount: parseDecimal('513750'),
        sales_price: parseDecimal('685000'),
        down_pmt: parseDecimal('171250'),
        interest_rate: null,
        term: normalizeTerm(360),
        piti: parseDecimal('5280.22'),
        loan_type: 'Conventional',
        program: 'Conventional',
        pr_type: mapPrType('P'),
        income_type: 'SALARY',
        estimated_fico: parseFico('751'),
        total_monthly_income: parseDecimal('15925'),
        monthly_liabilities: parseDecimal('4886.15'),
        escrows: null,
        property_type: mapPropertyType('CONDO'),
        occupancy: mapOccupancy('PRIMARY'),
        subject_address_1: '1850 Monroe St.',
        subject_address_2: '#409',
        subject_city: 'Hollywood',
        subject_state: 'FL',
        subject_zip: '33020',
        condo_name: 'The Residence on Monroe Condominium',
        appraisal_value: '650000',
        appr_date_time: parseDate('2025-09-29 11:00'),
        appr_eta: parseDate('2025-10-03'),
        fin_cont: parseDate('2025-04-15'),
        disclosure_status: mapDisclosureStatus('SENT'),
        loan_status: mapLoanStatus('RFP'),
        title_status: mapTitleStatus('REQUESTED'),
        hoi_status: mapHoiStatus('RECEIVED'),
        title_ordered_date: parseDate('2025-03-14'),
        buyer_agent_id: getAgentId('Monserrat', 'Cardoso'),
        listing_agent_id: null, // No agent yet
        approved_lender_id: getLenderId('PENNYMAC'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
      // INCOMING Lead 21: Josefina Coviello
      {
        first_name: 'Josefina',
        last_name: 'Coviello',
        email: 'josefinacoviello@gmail.com',
        phone: '7863188502',
        dob: parseDate('1979-07-03'),
        borrower_current_address: '7549 Adventure Avenue',
        lead_on_date: parseDate('2025-11-05'),
        pending_app_at: parseDate('2025-11-06'),
        app_complete_at: parseDate('2025-11-06'),
        pre_qualified_at: parseDate('2025-11-06'),
        pre_approved_at: parseDate('2025-11-06'),
        active_at: parseDate('2025-11-10'),
        close_date: parseDate('2025-12-19'),
        arrive_loan_number: 15414874,
        loan_amount: parseDecimal('165000'),
        sales_price: parseDecimal('220000'),
        down_pmt: parseDecimal('66000'),
        interest_rate: null,
        term: null,
        piti: parseDecimal('1225.12'),
        program: null,
        pr_type: mapPrType('P'),
        income_type: 'DSCR',
        estimated_fico: parseFico('788'),
        total_monthly_income: parseDecimal('10000'),
        escrows: mapEscrows('YES'),
        property_type: mapPropertyType('Condominium'),
        occupancy: mapOccupancy('Investment'),
        subject_address_1: '1925 Washington Avenue',
        subject_address_2: '#8',
        subject_city: 'Miami Beach',
        subject_state: 'FL',
        condo_name: null,
        appraisal_value: null,
        fin_cont: parseDate('2025-12-07'),
        disclosure_status: mapDisclosureStatus('SIGNED'),
        loan_status: mapLoanStatus('SUB'),
        condo_status: null, // PENDING ORDER
        title_ordered_date: null,
        buyer_agent_id: getAgentId('Josefina', 'Coviello'), // Self-agent
        listing_agent_id: getAgentId('Adriana', 'Faerman'),
        approved_lender_id: getLenderId('A&D'),
        pipeline_stage_id: activePipelineStageId,
        reo: toBool('NO'),
      },
    ];

    // Step 11: Insert leads with account_id and created_by
    let insertedLeadsCount = 0;

    if (confirm) {
      for (const lead of activeLeads) {
        // Ensure account_id and created_by are set for all leads
        const leadWithAccount = { 
          ...lead, 
          account_id: defaultAccountId,
          created_by: defaultUserId
        };
        const { error } = await supabase.from('leads').insert(leadWithAccount);

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
