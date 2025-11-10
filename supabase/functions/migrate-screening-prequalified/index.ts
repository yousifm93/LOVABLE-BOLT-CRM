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

    // Step 2: Define 11 new buyer agents
    const newAgents = [
      { first_name: 'Victoria', last_name: 'Cheng', brokerage: 'Unknown' },
      { first_name: 'Sam', last_name: 'Mogannam', brokerage: 'Unknown' },
      { first_name: 'Yaniv', last_name: 'Shemesh', brokerage: 'Unknown' },
      { first_name: 'Robert', last_name: 'Slavin', brokerage: 'Unknown' },
      { first_name: 'Flavio', last_name: 'Pentagna', brokerage: 'Unknown' },
      { first_name: 'Jeff', last_name: 'Lichtenstein', brokerage: 'Unknown' },
      { first_name: 'Marilyn', last_name: 'Arango', brokerage: 'Unknown' },
      { first_name: 'Kristine', last_name: 'Brown', brokerage: 'Unknown' },
      { first_name: 'Livia', last_name: 'Ballou', brokerage: 'Unknown' },
      { first_name: 'Paul', last_name: 'Scutaro', brokerage: 'Unknown' },
      { first_name: 'Aura', last_name: 'Caruso', brokerage: 'Unknown' }
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

    // Define 3 Screening leads
    const screeningLeads = [
      {
        first_name: 'Jake', last_name: 'Levin',
        lead_on_date: '2024-08-27', pending_app_at: '2024-09-03T00:00:00Z', app_complete_at: '2024-10-17T00:00:00Z',
        arrive_loan_number: '104037', email: 'jakelevin15@gmail.com', phone: '+1 954 494 4070',
        task_eta: '2024-10-31', agent_name: 'Victoria Cheng'
      },
      {
        first_name: 'Andrea', last_name: 'Weiss',
        lead_on_date: '2024-09-16', pending_app_at: '2024-09-30T00:00:00Z', app_complete_at: '2024-10-29T00:00:00Z',
        arrive_loan_number: '104085', email: 'andreaweiss55@gmail.com', phone: NULL,
        task_eta: '2024-11-01', agent_name: NULL
      },
      {
        first_name: 'Itamar', last_name: 'Melzer',
        lead_on_date: '2024-10-14', pending_app_at: '2024-10-22T00:00:00Z', app_complete_at: '2024-11-10T00:00:00Z',
        arrive_loan_number: '104132', email: NULL, phone: NULL,
        task_eta: '2024-11-10', agent_name: NULL
      }
    ];

    // Define 18 Pre-Qualified leads with comprehensive data
    const prequalifiedLeads = [
      {
        first_name: 'Denis', last_name: 'Esptein',
        lead_on_date: '2023-12-19', pending_app_at: '2023-12-22T00:00:00Z', app_complete_at: '2024-01-15T00:00:00Z', pre_qualified_at: '2024-01-19T00:00:00Z',
        arrive_loan_number: '103279', loan_amount: 850000, sales_price: 1100000, down_pmt: 250000, interest_rate: 6.750,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-04-30', agent_name: 'Sam Mogannam'
      },
      {
        first_name: 'Roman', last_name: 'Dvorkin',
        lead_on_date: '2024-02-07', pending_app_at: '2024-02-08T00:00:00Z', app_complete_at: '2024-02-10T00:00:00Z', pre_qualified_at: '2024-02-19T00:00:00Z',
        arrive_loan_number: '103336', loan_amount: 2320000, sales_price: 2900000, down_pmt: 580000, interest_rate: 7.625,
        monthly_pmt_goal: NULL, program: 'Conventional', property_type: 'SFR', occupancy: 'Primary',
        pr_type: NULL, income_type: 'W2', reo: 'N', task_eta: '2024-10-17', agent_name: 'Yaniv Shemesh'
      },
      {
        first_name: 'Enno', last_name: 'Schultze',
        lead_on_date: '2024-02-14', pending_app_at: '2024-02-15T00:00:00Z', app_complete_at: '2024-02-20T00:00:00Z', pre_qualified_at: '2024-02-28T00:00:00Z',
        arrive_loan_number: '103357', loan_amount: 1850000, sales_price: 2310000, down_pmt: 460000, interest_rate: 7.750,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'N', task_eta: '2024-10-31', agent_name: 'Robert Slavin'
      },
      {
        first_name: 'Itay', last_name: 'Cohen',
        lead_on_date: '2024-03-03', pending_app_at: '2024-03-05T00:00:00Z', app_complete_at: '2024-03-10T00:00:00Z', pre_qualified_at: '2024-03-13T00:00:00Z',
        arrive_loan_number: '103391', loan_amount: 650000, sales_price: 830000, down_pmt: 180000, interest_rate: 7.375,
        monthly_pmt_goal: NULL, program: 'DSCR', property_type: 'SFR', occupancy: 'Investment',
        pr_type: NULL, income_type: NULL, reo: 'Y', task_eta: '2024-10-31', agent_name: 'Flavio Pentagna'
      },
      {
        first_name: 'Zoe', last_name: 'Sayegh',
        lead_on_date: '2024-03-06', pending_app_at: '2024-03-07T00:00:00Z', app_complete_at: '2024-03-13T00:00:00Z', pre_qualified_at: '2024-03-18T00:00:00Z',
        arrive_loan_number: '103393', loan_amount: 605000, sales_price: 775000, down_pmt: 170000, interest_rate: 7.500,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'SFR', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-23', agent_name: 'Jeff Lichtenstein'
      },
      {
        first_name: 'Celia', last_name: 'Pelayo',
        lead_on_date: '2024-03-25', pending_app_at: '2024-03-25T00:00:00Z', app_complete_at: '2024-03-27T00:00:00Z', pre_qualified_at: '2024-04-02T00:00:00Z',
        arrive_loan_number: '103434', loan_amount: 515000, sales_price: 660000, down_pmt: 145000, interest_rate: 7.500,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'SFR', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'N', task_eta: '2024-10-17', agent_name: 'Marilyn Arango'
      },
      {
        first_name: 'Andrea', last_name: 'Da Silva',
        lead_on_date: '2024-05-05', pending_app_at: '2024-05-06T00:00:00Z', app_complete_at: '2024-05-13T00:00:00Z', pre_qualified_at: '2024-05-14T00:00:00Z',
        arrive_loan_number: '103548', loan_amount: 500000, sales_price: 625000, down_pmt: 125000, interest_rate: 7.250,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-23', agent_name: 'Kristine Brown'
      },
      {
        first_name: 'Shahin', last_name: 'Vafai',
        lead_on_date: '2024-05-06', pending_app_at: '2024-05-08T00:00:00Z', app_complete_at: '2024-05-13T00:00:00Z', pre_qualified_at: '2024-05-17T00:00:00Z',
        arrive_loan_number: '103552', loan_amount: 715000, sales_price: 895000, down_pmt: 180000, interest_rate: 7.250,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-17', agent_name: 'Livia Ballou'
      },
      {
        first_name: 'Osvaldo', last_name: 'Soto',
        lead_on_date: '2024-05-09', pending_app_at: '2024-05-10T00:00:00Z', app_complete_at: '2024-05-17T00:00:00Z', pre_qualified_at: '2024-05-17T00:00:00Z',
        arrive_loan_number: '103557', loan_amount: 530000, sales_price: 670000, down_pmt: 140000, interest_rate: 7.250,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-31', agent_name: 'Kristine Brown'
      },
      {
        first_name: 'Amanda', last_name: 'Lichtenstein',
        lead_on_date: '2024-05-10', pending_app_at: '2024-05-13T00:00:00Z', app_complete_at: '2024-05-20T00:00:00Z', pre_qualified_at: '2024-05-28T00:00:00Z',
        arrive_loan_number: '103563', loan_amount: 1050000, sales_price: 1315000, down_pmt: 265000, interest_rate: 7.250,
        monthly_pmt_goal: NULL, program: 'Conventional', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: 'W2', reo: 'N', task_eta: '2024-10-31', agent_name: 'Jeff Lichtenstein'
      },
      {
        first_name: 'Roshanak', last_name: 'Izadshenas',
        lead_on_date: '2024-05-12', pending_app_at: '2024-05-13T00:00:00Z', app_complete_at: '2024-05-20T00:00:00Z', pre_qualified_at: '2024-05-28T00:00:00Z',
        arrive_loan_number: '103567', loan_amount: 1050000, sales_price: 1315000, down_pmt: 265000, interest_rate: 7.250,
        monthly_pmt_goal: NULL, program: 'Conventional', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: 'W2', reo: 'N', task_eta: '2024-10-17', agent_name: 'Jeff Lichtenstein'
      },
      {
        first_name: 'Gustavo', last_name: 'Coutinho',
        lead_on_date: '2024-05-28', pending_app_at: '2024-05-29T00:00:00Z', app_complete_at: '2024-06-05T00:00:00Z', pre_qualified_at: '2024-06-10T00:00:00Z',
        arrive_loan_number: '103601', loan_amount: 485000, sales_price: 607000, down_pmt: 122000, interest_rate: 7.250,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-23', agent_name: 'Paul Scutaro'
      },
      {
        first_name: 'Fabio', last_name: 'Neves',
        lead_on_date: '2024-05-29', pending_app_at: '2024-05-31T00:00:00Z', app_complete_at: '2024-06-06T00:00:00Z', pre_qualified_at: '2024-06-11T00:00:00Z',
        arrive_loan_number: '103609', loan_amount: 550000, sales_price: 690000, down_pmt: 140000, interest_rate: 7.125,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-23', agent_name: 'Paul Scutaro'
      },
      {
        first_name: 'Erez', last_name: 'Dahari',
        lead_on_date: '2024-06-03', pending_app_at: '2024-06-04T00:00:00Z', app_complete_at: '2024-06-11T00:00:00Z', pre_qualified_at: '2024-06-17T00:00:00Z',
        arrive_loan_number: '103619', loan_amount: 575000, sales_price: 720000, down_pmt: 145000, interest_rate: 7.125,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-17', agent_name: 'Aura Caruso'
      },
      {
        first_name: 'Roger', last_name: 'Tapia',
        lead_on_date: '2024-06-17', pending_app_at: '2024-06-18T00:00:00Z', app_complete_at: '2024-06-25T00:00:00Z', pre_qualified_at: '2024-07-01T00:00:00Z',
        arrive_loan_number: '103657', loan_amount: 450000, sales_price: 565000, down_pmt: 115000, interest_rate: 7.125,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-23', agent_name: 'Livia Ballou'
      },
      {
        first_name: 'Dennis', last_name: 'Bielich',
        lead_on_date: '2024-07-16', pending_app_at: '2024-07-17T00:00:00Z', app_complete_at: '2024-07-24T00:00:00Z', pre_qualified_at: '2024-07-29T00:00:00Z',
        arrive_loan_number: '103755', loan_amount: 470000, sales_price: 590000, down_pmt: 120000, interest_rate: 6.875,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-31', agent_name: 'Aura Caruso'
      },
      {
        first_name: 'Miriam', last_name: 'Sasson',
        lead_on_date: '2024-07-19', pending_app_at: '2024-07-22T00:00:00Z', app_complete_at: '2024-07-29T00:00:00Z', pre_qualified_at: '2024-08-02T00:00:00Z',
        arrive_loan_number: '103771', loan_amount: 450000, sales_price: 565000, down_pmt: 115000, interest_rate: 6.750,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-31', agent_name: 'Aura Caruso'
      },
      {
        first_name: 'Roger', last_name: 'Khafif',
        lead_on_date: '2024-08-12', pending_app_at: '2024-08-13T00:00:00Z', app_complete_at: '2024-08-20T00:00:00Z', pre_qualified_at: '2024-08-26T00:00:00Z',
        arrive_loan_number: '103887', loan_amount: 2250000, sales_price: 2810000, down_pmt: 560000, interest_rate: 6.750,
        monthly_pmt_goal: NULL, program: 'Bank Statement', property_type: 'Condo', occupancy: 'Primary',
        pr_type: NULL, income_type: '1099', reo: 'Y', task_eta: '2024-10-31', agent_name: 'Aura Caruso'
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
