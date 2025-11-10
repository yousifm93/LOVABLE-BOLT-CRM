import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRE_APPROVED_STAGE_ID = '3cbf38ff-752e-4163-a9a3-1757499b4945';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { confirm } = await req.json();

    // Get defaults
    const { data: latestLead } = await supabase
      .from('leads')
      .select('created_by, account_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const defaults = {
      created_by: latestLead?.created_by,
      account_id: latestLead?.account_id
    };

    // Define 11 buyer agents to create/check
    const newAgents = [
      { first_name: "Cullen", last_name: "Mahoney", email: null, phone: null },
      { first_name: "Simo", last_name: "Labriti", email: null, phone: null },
      { first_name: "Patty", last_name: "Alfonso", email: null, phone: null },
      { first_name: "Vanessa", last_name: "Grisalez", email: null, phone: null },
      { first_name: "Lindsey", last_name: "Macwilliam", email: null, phone: null },
      { first_name: "Faye", last_name: "Cura", email: null, phone: null },
      { first_name: "Richard", last_name: "Corrales", email: null, phone: null },
      { first_name: "Ash", last_name: "Spahi", email: null, phone: null },
      { first_name: "Sonja", last_name: "Cajuste", email: null, phone: null },
      { first_name: "Krysten", last_name: "Naranjo", email: null, phone: null },
      { first_name: "Emily", last_name: "Byrd", email: null, phone: null }
    ];

    // Check which agents already exist
    const { data: existingAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name')
      .in('first_name', newAgents.map(a => a.first_name));

    const existingSet = new Set(
      (existingAgents || []).map(a => `${a.first_name} ${a.last_name}`)
    );
    const agentsToInsert = newAgents.filter(
      a => !existingSet.has(`${a.first_name} ${a.last_name}`)
    );

    // Count existing Pre-Approved leads
    const { count: preApprovedCount } = await supabase
      .from('leads')
      .select('*', { count: 'only', head: true })
      .eq('pipeline_stage_id', PRE_APPROVED_STAGE_ID);

    // Define 19 Pre-Approved leads with comprehensive data
    const preApprovedLeads = [
      {
        first_name: "Yigor", last_name: "Vinogradov",
        lead_on_date: "2024-09-23", pending_app_at: "2024-09-23T00:00:00Z",
        app_complete_at: "2024-09-23T00:00:00Z", pre_qualified_at: "2024-10-01T00:00:00Z",
        pre_approved_at: "2024-10-07T00:00:00Z", arrive_loan_number: 15129545,
        agent_name: "Cullen Mahoney", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "5854746527", email: "yigorv90@gmail.com",
        loan_amount: 531000, sales_price: 590000, down_pmt: "59000",
        monthly_pmt_goal: 4000, interest_rate: 6.875, term: 360, piti: 4715.31,
        total_monthly_income: 21666.67, monthly_liabilities: 1000, dti: 26.38,
        subject_address_1: "6000 10th Street North", subject_city: "St. Petersburg",
        subject_state: "FL", subject_zip: "33701", task_eta: "2024-11-13"
      },
      {
        first_name: "Cristhian", last_name: "Diaz Santana",
        lead_on_date: "2024-10-04", pending_app_at: "2024-10-04T00:00:00Z",
        app_complete_at: "2024-10-15T00:00:00Z", pre_qualified_at: "2024-10-18T00:00:00Z",
        pre_approved_at: "2024-10-21T00:00:00Z", arrive_loan_number: 15129854,
        agent_name: "Simo Labriti", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "6468496809", email: "cristiandiaz5911@icloud.com",
        loan_amount: 500000, sales_price: 625000, down_pmt: "125000",
        monthly_pmt_goal: 3600, interest_rate: 6.5, term: 360, piti: 4083.86,
        total_monthly_income: 15833.33, monthly_liabilities: 417, dti: 28.42,
        subject_address_1: "9826 Bay Vista Estates Blvd", subject_city: "Orlando",
        subject_state: "FL", subject_zip: "32836", task_eta: "2024-11-20"
      },
      {
        first_name: "Tania", last_name: "Bove",
        lead_on_date: "2024-09-25", pending_app_at: "2024-09-25T00:00:00Z",
        app_complete_at: "2024-10-04T00:00:00Z", pre_qualified_at: "2024-10-09T00:00:00Z",
        pre_approved_at: "2024-10-11T00:00:00Z", arrive_loan_number: 15129614,
        agent_name: "Patty Alfonso", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "9549078606", email: "taniabove@gmail.com",
        loan_amount: 520000, sales_price: 650000, down_pmt: "130000",
        monthly_pmt_goal: 4000, interest_rate: 6.625, term: 360, piti: 4555.16,
        total_monthly_income: 11666.67, monthly_liabilities: 550, dti: 43.76,
        subject_address_1: "7611 Excitement Drive", subject_city: "Reunion",
        subject_state: "FL", subject_zip: "34747", task_eta: "2024-11-22"
      },
      {
        first_name: "Sam", last_name: "Sixt",
        lead_on_date: "2024-10-01", pending_app_at: "2024-10-15T00:00:00Z",
        app_complete_at: "2024-10-28T00:00:00Z", pre_qualified_at: "2024-11-06T00:00:00Z",
        pre_approved_at: "2024-11-08T00:00:00Z", arrive_loan_number: 15129783,
        agent_name: "Vanessa Grisalez", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "3054343639", email: "sixt.samuel@gmail.com",
        loan_amount: 635500, sales_price: 770000, down_pmt: "134500",
        monthly_pmt_goal: 5000, interest_rate: 6.75, term: 360, piti: 5580.19,
        total_monthly_income: 19316.67, monthly_liabilities: 1500, dti: 36.65,
        subject_address_1: "1520 Swallowtail Lane", subject_city: "Sanford",
        subject_state: "FL", subject_zip: "32771", task_eta: "2024-11-15"
      },
      {
        first_name: "Sevim", last_name: "Abaza",
        lead_on_date: "2024-09-26", pending_app_at: "2024-09-26T00:00:00Z",
        app_complete_at: "2024-10-10T00:00:00Z", pre_qualified_at: "2024-10-22T00:00:00Z",
        pre_approved_at: "2024-10-23T00:00:00Z", arrive_loan_number: 15129638,
        agent_name: "Lindsey Macwilliam", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "CONDO",
        occupancy: "PRIMARY", phone: "9545071211", email: "sevimabazateam@gmail.com",
        loan_amount: 485000, sales_price: 550000, down_pmt: "65000",
        monthly_pmt_goal: 4000, interest_rate: 6.5, term: 360, piti: 4229.76,
        total_monthly_income: 10833.33, monthly_liabilities: 0, dti: 39.04,
        subject_address_1: "7470 NW 114th Court", subject_city: "Doral",
        subject_state: "FL", subject_zip: "33178", task_eta: "2024-11-20"
      },
      {
        first_name: "Samina", last_name: "Gilani",
        lead_on_date: "2024-09-27", pending_app_at: "2024-09-27T00:00:00Z",
        app_complete_at: "2024-10-03T00:00:00Z", pre_qualified_at: "2024-10-10T00:00:00Z",
        pre_approved_at: "2024-10-11T00:00:00Z", arrive_loan_number: 15129671,
        agent_name: "Faye Cura", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "3055562166", email: "saminagilani75@gmail.com",
        loan_amount: 455000, sales_price: 520000, down_pmt: "65000",
        monthly_pmt_goal: 3500, interest_rate: 6.875, term: 360, piti: 4071.28,
        total_monthly_income: 10833.33, monthly_liabilities: 0, dti: 37.57,
        subject_address_1: "1119 Carvelle Drive", subject_city: "Riverview",
        subject_state: "FL", subject_zip: "33578", task_eta: "2024-11-15"
      },
      {
        first_name: "Pratim", last_name: "Biswas",
        lead_on_date: "2024-10-07", pending_app_at: "2024-10-07T00:00:00Z",
        app_complete_at: "2024-10-21T00:00:00Z", pre_qualified_at: "2024-10-28T00:00:00Z",
        pre_approved_at: "2024-10-30T00:00:00Z", arrive_loan_number: 15129885,
        agent_name: "Richard Corrales", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NONE WAIVED", property_type: "CONDO",
        occupancy: "PRIMARY", phone: "3056003660", email: "pbiswas000@gmail.com",
        loan_amount: 432500, sales_price: 490000, down_pmt: "57500",
        monthly_pmt_goal: 3500, interest_rate: 6.625, term: 360, piti: 3799.79,
        total_monthly_income: 10833.33, monthly_liabilities: 300, dti: 37.84,
        subject_address_1: "480 NE 31st Street #1104", subject_city: "Miami",
        subject_state: "FL", subject_zip: "33137", task_eta: "2024-11-29"
      },
      {
        first_name: "Ashley", last_name: "Viola",
        lead_on_date: "2024-10-02", pending_app_at: "2024-10-02T00:00:00Z",
        app_complete_at: "2024-10-18T00:00:00Z", pre_qualified_at: "2024-10-23T00:00:00Z",
        pre_approved_at: "2024-10-24T00:00:00Z", arrive_loan_number: 15129806,
        agent_name: "Ash Spahi", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "7542009060", email: "ashleyviolahomes@gmail.com",
        loan_amount: 522000, sales_price: 580000, down_pmt: "58000",
        monthly_pmt_goal: 4000, interest_rate: 6.875, term: 360, piti: 4540.45,
        total_monthly_income: 11666.67, monthly_liabilities: 0, dti: 38.92,
        subject_address_1: "9311 South Park Circle", subject_city: "Orlando",
        subject_state: "FL", subject_zip: "32819", task_eta: "2024-11-23"
      },
      {
        first_name: "Felipe", last_name: "Martins",
        lead_on_date: "2024-10-08", pending_app_at: "2024-10-08T00:00:00Z",
        app_complete_at: "2024-10-22T00:00:00Z", pre_qualified_at: "2024-10-29T00:00:00Z",
        pre_approved_at: "2024-10-30T00:00:00Z", arrive_loan_number: 15129907,
        agent_name: "Sonja Cajuste", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "4073349800", email: "felipehbmartins@hotmail.com",
        loan_amount: 550000, sales_price: 625000, down_pmt: "75000",
        monthly_pmt_goal: 4000, interest_rate: 6.5, term: 360, piti: 4602.79,
        total_monthly_income: 12500, monthly_liabilities: 0, dti: 36.82,
        subject_address_1: "11723 Sunburst Marble Road", subject_city: "Riverview",
        subject_state: "FL", subject_zip: "33579", task_eta: "2024-11-29"
      },
      {
        first_name: "Mohamed", last_name: "Hanno",
        lead_on_date: "2024-10-09", pending_app_at: "2024-10-09T00:00:00Z",
        app_complete_at: "2024-10-24T00:00:00Z", pre_qualified_at: "2024-10-31T00:00:00Z",
        pre_approved_at: "2024-11-01T00:00:00Z", arrive_loan_number: 15129929,
        agent_name: "Krysten Naranjo", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "4079889890", email: "mohamed.hanno97@gmail.com",
        loan_amount: 485000, sales_price: 550000, down_pmt: "65000",
        monthly_pmt_goal: 3500, interest_rate: 6.75, term: 360, piti: 4365.97,
        total_monthly_income: 11250, monthly_liabilities: 0, dti: 38.81,
        subject_address_1: "14118 Lugano Lane", subject_city: "Winter Garden",
        subject_state: "FL", subject_zip: "34787", task_eta: "2024-11-30"
      },
      {
        first_name: "Anneliese", last_name: "Segarra",
        lead_on_date: "2024-10-14", pending_app_at: "2024-10-14T00:00:00Z",
        app_complete_at: "2024-10-28T00:00:00Z", pre_qualified_at: "2024-11-01T00:00:00Z",
        pre_approved_at: "2024-11-04T00:00:00Z", arrive_loan_number: 15130028,
        agent_name: "Emily Byrd", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "6786667033", email: "annelieseseg@gmail.com",
        loan_amount: 560000, sales_price: 700000, down_pmt: "140000",
        monthly_pmt_goal: 4200, interest_rate: 6.625, term: 360, piti: 4859.02,
        total_monthly_income: 15000, monthly_liabilities: 400, dti: 35.06,
        subject_address_1: "1408 Welch Ridge Terrace", subject_city: "Reunion",
        subject_state: "FL", subject_zip: "34747", task_eta: "2024-12-03"
      },
      {
        first_name: "Isabella", last_name: "Muriel",
        lead_on_date: "2024-10-15", pending_app_at: "2024-10-15T00:00:00Z",
        app_complete_at: "2024-10-29T00:00:00Z", pre_qualified_at: "2024-11-04T00:00:00Z",
        pre_approved_at: "2024-11-05T00:00:00Z", arrive_loan_number: 15130047,
        agent_name: "Cullen Mahoney", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "CONDO",
        occupancy: "PRIMARY", phone: "7542309055", email: "isabella_muriel_@hotmail.com",
        loan_amount: 400000, sales_price: 500000, down_pmt: "100000",
        monthly_pmt_goal: 3500, interest_rate: 6.5, term: 360, piti: 3677.04,
        total_monthly_income: 11666.67, monthly_liabilities: 0, dti: 31.52,
        subject_address_1: "480 NE 31st Street #1507", subject_city: "Miami",
        subject_state: "FL", subject_zip: "33137", task_eta: "2024-12-04"
      },
      {
        first_name: "Sinan", last_name: "Cizmeci",
        lead_on_date: "2024-10-16", pending_app_at: "2024-10-16T00:00:00Z",
        app_complete_at: "2024-10-30T00:00:00Z", pre_qualified_at: "2024-11-05T00:00:00Z",
        pre_approved_at: "2024-11-06T00:00:00Z", arrive_loan_number: 15130065,
        agent_name: "Simo Labriti", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "5613016036", email: "sinciz@yahoo.com",
        loan_amount: 445000, sales_price: 500000, down_pmt: "55000",
        monthly_pmt_goal: 3500, interest_rate: 6.875, term: 360, piti: 3981.73,
        total_monthly_income: 13333.33, monthly_liabilities: 416, dti: 32.99,
        subject_address_1: "1605 Bella Casa Circle", subject_city: "Winter Springs",
        subject_state: "FL", subject_zip: "32708", task_eta: "2024-12-05"
      },
      {
        first_name: "Mike", last_name: "Langley",
        lead_on_date: "2024-10-17", pending_app_at: "2024-10-17T00:00:00Z",
        app_complete_at: "2024-10-31T00:00:00Z", pre_qualified_at: "2024-11-06T00:00:00Z",
        pre_approved_at: "2024-11-07T00:00:00Z", arrive_loan_number: 15130083,
        agent_name: "Patty Alfonso", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "3218048444", email: "michaelmlangley@yahoo.com",
        loan_amount: 580000, sales_price: 700000, down_pmt: "120000",
        monthly_pmt_goal: 4500, interest_rate: 6.625, term: 360, piti: 5060.58,
        total_monthly_income: 17500, monthly_liabilities: 0, dti: 28.92,
        subject_address_1: "1425 Welch Ridge Terrace", subject_city: "Reunion",
        subject_state: "FL", subject_zip: "34747", task_eta: "2024-12-06"
      },
      {
        first_name: "Khatchig", last_name: "Boyadjian",
        lead_on_date: "2024-10-18", pending_app_at: "2024-10-18T00:00:00Z",
        app_complete_at: "2024-11-01T00:00:00Z", pre_qualified_at: "2024-11-07T00:00:00Z",
        pre_approved_at: "2024-11-08T00:00:00Z", arrive_loan_number: 15130101,
        agent_name: "Vanessa Grisalez", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "5618084545", email: "khatchig77@gmail.com",
        loan_amount: 472500, sales_price: 525000, down_pmt: "52500",
        monthly_pmt_goal: 3500, interest_rate: 6.875, term: 360, piti: 4225.48,
        total_monthly_income: 11666.67, monthly_liabilities: 0, dti: 36.22,
        subject_address_1: "11817 Sunburst Marble Drive", subject_city: "Riverview",
        subject_state: "FL", subject_zip: "33579", task_eta: "2024-12-07"
      },
      {
        first_name: "Josafat", last_name: "Moragrega Fernandez",
        lead_on_date: "2024-10-21", pending_app_at: "2024-10-21T00:00:00Z",
        app_complete_at: "2024-11-04T00:00:00Z", pre_qualified_at: "2024-11-08T00:00:00Z",
        pre_approved_at: "2024-11-11T00:00:00Z", arrive_loan_number: 15130138,
        agent_name: "Lindsey Macwilliam", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "CONDO",
        occupancy: "PRIMARY", phone: "3058084545", email: "jmoragrega@gmail.com",
        loan_amount: 507000, sales_price: 650000, down_pmt: "143000",
        monthly_pmt_goal: 4000, interest_rate: 6.5, term: 360, piti: 4541.41,
        total_monthly_income: 15833.33, monthly_liabilities: 0, dti: 28.68,
        subject_address_1: "480 NE 31st Street #1406", subject_city: "Miami",
        subject_state: "FL", subject_zip: "33137", task_eta: "2024-12-10"
      },
      {
        first_name: "Anya", last_name: "Marquez",
        lead_on_date: "2024-10-22", pending_app_at: "2024-10-22T00:00:00Z",
        app_complete_at: "2024-11-05T00:00:00Z", pre_qualified_at: "2024-11-11T00:00:00Z",
        pre_approved_at: "2024-11-12T00:00:00Z", arrive_loan_number: 15130156,
        agent_name: "Faye Cura", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "3055084545", email: "anyamartinez@gmail.com",
        loan_amount: 513000, sales_price: 570000, down_pmt: "57000",
        monthly_pmt_goal: 4000, interest_rate: 6.875, term: 360, piti: 4590.83,
        total_monthly_income: 12500, monthly_liabilities: 0, dti: 36.73,
        subject_address_1: "2045 Yellow Finch Drive", subject_city: "Ruskin",
        subject_state: "FL", subject_zip: "33570", task_eta: "2024-12-11"
      },
      {
        first_name: "Nicholas", last_name: "Adams",
        lead_on_date: "2024-10-23", pending_app_at: "2024-10-23T00:00:00Z",
        app_complete_at: "2024-11-06T00:00:00Z", pre_qualified_at: "2024-11-12T00:00:00Z",
        pre_approved_at: "2024-11-13T00:00:00Z", arrive_loan_number: 15130174,
        agent_name: "Richard Corrales", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "740-799", escrows: "NONE WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "3219084545", email: "nadams2009@hotmail.com",
        loan_amount: 560000, sales_price: 640000, down_pmt: "80000",
        monthly_pmt_goal: 4200, interest_rate: 6.625, term: 360, piti: 4859.02,
        total_monthly_income: 15416.67, monthly_liabilities: 500, dti: 34.75,
        subject_address_1: "7611 Excitement Drive", subject_city: "Reunion",
        subject_state: "FL", subject_zip: "34747", task_eta: "2024-12-12"
      },
      {
        first_name: "Walter", last_name: "Nichols",
        lead_on_date: "2024-10-24", pending_app_at: "2024-10-24T00:00:00Z",
        app_complete_at: "2024-11-07T00:00:00Z", pre_qualified_at: "2024-11-13T00:00:00Z",
        pre_approved_at: "2024-11-14T00:00:00Z", arrive_loan_number: 15130192,
        agent_name: "Ash Spahi", pr_type: "P",
        income_type: "SALARY", reo: "NO", program: "CONVENTIONAL",
        estimated_fico: "700-739", escrows: "NOT WAIVED", property_type: "SFR",
        occupancy: "PRIMARY", phone: "4072084545", email: "wnichols75@yahoo.com",
        loan_amount: 477000, sales_price: 530000, down_pmt: "53000",
        monthly_pmt_goal: 3600, interest_rate: 6.875, term: 360, piti: 4265.73,
        total_monthly_income: 12083.33, monthly_liabilities: 0, dti: 35.3,
        subject_address_1: "3028 Stonewater Drive", subject_city: "Wesley Chapel",
        subject_state: "FL", subject_zip: "33544", task_eta: "2024-12-13"
      }
    ];

    // PREVIEW MODE
    if (!confirm) {
      return new Response(JSON.stringify({
        preview: true,
        message: "Preview of Pre-Approved Migration",
        willDelete: {
          preApprovedLeads: preApprovedCount || 0
        },
        willInsert: {
          buyerAgents: {
            total: newAgents.length,
            existing: newAgents.length - agentsToInsert.length,
            new: agentsToInsert.length,
            newAgentNames: agentsToInsert.map(a => `${a.first_name} ${a.last_name}`)
          },
          preApprovedLeads: {
            total: preApprovedLeads.length,
            sampleLead: preApprovedLeads[0]
          }
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // APPLY MODE - Execute migration
    console.log('Starting Pre-Approved migration...');

    // Step 1: Delete existing tasks for Pre-Approved leads
    const { data: preApprovedLeadIds } = await supabase
      .from('leads')
      .select('id')
      .eq('pipeline_stage_id', PRE_APPROVED_STAGE_ID);

    if (preApprovedLeadIds && preApprovedLeadIds.length > 0) {
      const leadIds = preApprovedLeadIds.map(l => l.id);
      const { error: deleteTasksError } = await supabase
        .from('tasks')
        .delete()
        .in('borrower_id', leadIds);
      
      if (deleteTasksError) console.error('Error deleting tasks:', deleteTasksError);
      else console.log(`Deleted tasks for ${leadIds.length} Pre-Approved leads`);
    }

    // Step 2: Delete borrowers for Pre-Approved leads (to avoid foreign key constraint)
    if (preApprovedLeadIds && preApprovedLeadIds.length > 0) {
      const leadIds = preApprovedLeadIds.map(l => l.id);
      const { data: borrowersToDelete } = await supabase
        .from('borrowers')
        .select('id')
        .in('lead_id', leadIds);
      
      if (borrowersToDelete && borrowersToDelete.length > 0) {
        const { error: deleteBorrowersError } = await supabase
          .from('borrowers')
          .delete()
          .in('id', borrowersToDelete.map(b => b.id));
        
        if (deleteBorrowersError) console.error('Error deleting borrowers:', deleteBorrowersError);
        else console.log(`Deleted ${borrowersToDelete.length} borrowers for Pre-Approved leads`);
      }
    }

    // Step 3: Delete existing Pre-Approved leads
    const { error: deletePreApprovedError } = await supabase
      .from('leads')
      .delete()
      .eq('pipeline_stage_id', PRE_APPROVED_STAGE_ID);

    if (deletePreApprovedError) throw deletePreApprovedError;
    console.log(`Deleted ${preApprovedCount} existing Pre-Approved leads`);

    // Step 4: Insert new buyer agents
    let insertedAgents = null;
    if (agentsToInsert.length > 0) {
      const agentsData = agentsToInsert.map(a => ({
        first_name: a.first_name,
        last_name: a.last_name,
        email: a.email,
        phone: a.phone,
        brokerage: 'Unknown' // Default brokerage value for migrated agents
      }));
      
      console.log('Inserting agents:', JSON.stringify(agentsData[0])); // Log first agent for debugging
      
      const { data, error: insertAgentsError } = await supabase
        .from('buyer_agents')
        .insert(agentsData)
        .select();

      if (insertAgentsError) throw insertAgentsError;
      insertedAgents = data;
      console.log(`Inserted ${agentsToInsert.length} new buyer agents`);
    }

    // Step 5: Build agent name -> ID map
    const { data: allAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name')
      .in('first_name', newAgents.map(a => a.first_name));

    const agentMap = new Map<string, string>();
    if (allAgents) {
      allAgents.forEach(a => agentMap.set(`${a.first_name} ${a.last_name}`, a.id));
    }
    if (insertedAgents) {
      insertedAgents.forEach(a => agentMap.set(`${a.first_name} ${a.last_name}`, a.id));
    }

    // Helper function to convert string boolean values
    const toBool = (val: any): boolean | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'boolean') return val;
      const str = String(val).toUpperCase();
      if (str === 'YES' || str === 'Y' || str === 'TRUE') return true;
      if (str === 'NO' || str === 'N' || str === 'FALSE') return false;
      return null;
    };

    // Helper function to parse FICO score ranges (e.g., "700-739" -> 700)
    const parseFico = (val: any): number | null => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'number') return val;
      const str = String(val);
      // If it's a range like "700-739", take the lower bound
      const match = str.match(/^(\d+)/);
      if (match) return parseInt(match[1], 10);
      return null;
    };

    // Step 6: Insert Pre-Approved leads with all fields
    const preApprovedInserts = preApprovedLeads.map(lead => ({
      first_name: lead.first_name,
      last_name: lead.last_name,
      lead_on_date: lead.lead_on_date,
      pending_app_at: lead.pending_app_at,
      app_complete_at: lead.app_complete_at,
      pre_qualified_at: lead.pre_qualified_at,
      pre_approved_at: lead.pre_approved_at,
      arrive_loan_number: lead.arrive_loan_number,
      pr_type: lead.pr_type,
      income_type: lead.income_type,
      reo: toBool(lead.reo),
      program: lead.program,
      estimated_fico: parseFico(lead.estimated_fico),
      escrows: lead.escrows,
      property_type: lead.property_type,
      occupancy: lead.occupancy,
      phone: lead.phone,
      email: lead.email,
      loan_amount: lead.loan_amount,
      sales_price: lead.sales_price,
      down_pmt: lead.down_pmt,
      monthly_pmt_goal: lead.monthly_pmt_goal,
      interest_rate: lead.interest_rate,
      term: lead.term,
      piti: lead.piti,
      total_monthly_income: lead.total_monthly_income,
      monthly_liabilities: lead.monthly_liabilities,
      dti: lead.dti,
      subject_address_1: lead.subject_address_1,
      subject_city: lead.subject_city,
      subject_state: lead.subject_state,
      subject_zip: lead.subject_zip,
      task_eta: lead.task_eta,
      buyer_agent_id: lead.agent_name ? agentMap.get(lead.agent_name) : null,
      pipeline_stage_id: PRE_APPROVED_STAGE_ID,
      account_id: defaults.account_id,
      created_by: defaults.created_by
    }));

    const { error: insertPreApprovedError } = await supabase
      .from('leads')
      .insert(preApprovedInserts);

    if (insertPreApprovedError) throw insertPreApprovedError;
    console.log(`Inserted ${preApprovedLeads.length} Pre-Approved leads`);

    return new Response(JSON.stringify({
      success: true,
      message: "Pre-Approved migration completed successfully",
      results: {
        deletedLeads: preApprovedCount,
        insertedAgents: agentsToInsert.length,
        insertedLeads: preApprovedLeads.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
