import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Excel data mapped to CRM fields
const activeLoansData = [
  {
    mb_loan_number: '15173011',
    first_name: 'Diana',
    last_name: 'Alzate',
    close_date: '2025-12-12',
    loan_status: 'CTC',
    loan_amount: 183750,
    sales_price: 262500,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received', // Transfer -> Received (closest match)
    cd_status: null, // N/A
    package_status: 'Initial',
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: 'Signed',
    interest_rate: 6.625,
    lock_expiration_date: '2025-12-12',
    fico_score: 733,
    condo_name: 'Decoplage',
    subject_address_1: '100 Lincoln Road',
    subject_address_2: '#304',
    subject_city: 'Miami Beach',
    subject_state: 'FL',
    subject_zip: '33139',
    lender_loan_number: '1150455'
  },
  {
    mb_loan_number: '15417922',
    first_name: 'Jason',
    last_name: 'Jerald',
    close_date: '2025-12-15',
    loan_status: 'AWC',
    loan_amount: 352000,
    sales_price: 440000,
    title_status: 'Requested',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: null, // N/A
    epo_status: null,
    interest_rate: 6.625,
    lock_expiration_date: '2025-12-26',
    fico_score: 759,
    condo_name: 'The Club at Brickell Bay',
    subject_address_1: '1200 Brickell Bay Dr',
    subject_address_2: '#2821',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33131',
    lender_loan_number: '1162625'
  },
  {
    mb_loan_number: '14759707',
    first_name: 'Geetha',
    last_name: 'Sankuratri',
    close_date: '2025-12-12',
    loan_status: 'CTC',
    loan_amount: 421740,
    sales_price: 702900,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: null,
    package_status: 'Final',
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null, // N/A
    interest_rate: 6.875,
    lock_expiration_date: '2025-12-22',
    fico_score: 780,
    condo_name: 'District 25',
    subject_address_1: '225 North Miami Avenue',
    subject_address_2: '#1405',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33128',
    lender_loan_number: '4250899771'
  },
  {
    mb_loan_number: '14752473',
    first_name: 'Anil',
    last_name: 'Potluri',
    close_date: '2025-12-03',
    loan_status: 'CTC',
    loan_amount: 400140,
    sales_price: 666900,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: null,
    package_status: 'Final',
    disclosure_status: 'Signed',
    ba_status: null, // N/A
    epo_status: 'Signed',
    interest_rate: 6.375,
    lock_expiration_date: '2025-12-18',
    fico_score: 780,
    condo_name: 'District 25',
    subject_address_1: '225 N Miami Avenue',
    subject_address_2: '#2012',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33128',
    lender_loan_number: '1137663'
  },
  {
    mb_loan_number: '14548295',
    first_name: 'Yoseph',
    last_name: 'Cetton',
    close_date: '2025-12-05',
    loan_status: 'AWC',
    loan_amount: 175000,
    sales_price: null, // REFI
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: null, // N/A
    epo_status: null,
    interest_rate: 6.625,
    lock_expiration_date: '2025-12-15',
    fico_score: 740,
    condo_name: 'Nob Hill',
    subject_address_1: '7980 North Nob Hill Road',
    subject_address_2: '203',
    subject_city: 'Tamarac',
    subject_state: 'FL',
    subject_zip: '33321',
    lender_loan_number: '1120765'
  },
  {
    mb_loan_number: '13869119',
    first_name: 'Daniel',
    last_name: 'Faltas',
    close_date: '2025-12-12',
    loan_status: 'SUB',
    loan_amount: 513750,
    sales_price: 685000,
    title_status: 'Requested',
    hoi_status: 'Received',
    appraisal_status: 'Waiver',
    condo_status: 'Ordered', // Pending Order -> Ordered
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 751,
    condo_name: 'Residence on Monroe',
    subject_address_1: '1850 Monroe St.',
    subject_address_2: '#409',
    subject_city: 'Hollywood',
    subject_state: 'FL',
    subject_zip: '33020',
    lender_loan_number: '1102502'
  },
  {
    mb_loan_number: '12807701',
    first_name: 'Mohamed',
    last_name: 'Rasmy',
    close_date: '2025-12-12',
    loan_status: 'AWC',
    loan_amount: 215000,
    sales_price: 512000,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: null, // N/A
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: null, // N/A
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: null,
    condo_name: null,
    subject_address_1: '1057 Glenharbor Circle',
    subject_address_2: null,
    subject_city: 'Winter Garden',
    subject_state: 'FL',
    subject_zip: '34787',
    lender_loan_number: '1161948'
  },
  {
    mb_loan_number: '14772662',
    first_name: 'Sheela',
    last_name: 'Vallabhaneni',
    close_date: '2025-12-03',
    loan_status: 'AWC',
    loan_amount: 397140,
    sales_price: 661900,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: 'Signed',
    interest_rate: 6.99,
    lock_expiration_date: '2025-12-12',
    fico_score: 734,
    condo_name: 'District 25',
    subject_address_1: '225 North Miami Avenue',
    subject_address_2: '#1501',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33128',
    lender_loan_number: '4250899647'
  },
  {
    mb_loan_number: '15107908',
    first_name: 'Sheela',
    last_name: 'Crosby', // Sheela - Crosby
    close_date: '2025-12-04',
    loan_status: 'AWC',
    loan_amount: 292800,
    sales_price: 488000,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: null,
    condo_name: 'Crosby',
    subject_address_1: '698 NE 1st Avenue',
    subject_address_2: '2104',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33132',
    lender_loan_number: '1145289'
  },
  {
    mb_loan_number: '15135797',
    first_name: 'Pallavi',
    last_name: 'Reddy',
    close_date: '2025-12-05',
    loan_status: 'CTC',
    loan_amount: 301200,
    sales_price: 502000,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: null,
    package_status: 'Initial',
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: 'Signed',
    interest_rate: 6.625,
    lock_expiration_date: '2025-12-19',
    fico_score: 792,
    condo_name: 'Crosby',
    subject_address_1: '601 North Miami Avenue',
    subject_address_2: '#2005',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33132',
    lender_loan_number: '1160589'
  },
  {
    mb_loan_number: '15181642',
    first_name: 'Nicholas',
    last_name: 'Burchill',
    close_date: '2025-12-08',
    loan_status: 'FRD',
    loan_amount: 325600,
    sales_price: 407000,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: 'Signed',
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: 'Signed',
    interest_rate: 10,
    lock_expiration_date: '2025-12-12',
    fico_score: 766,
    condo_name: 'Infinity At Brickell',
    subject_address_1: '60 SW 13th St',
    subject_address_2: '#1805',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33130',
    lender_loan_number: '12025103385'
  },
  {
    mb_loan_number: '13623776',
    first_name: 'Myles',
    last_name: 'Munroe',
    close_date: '2025-12-10',
    loan_status: 'AWC',
    loan_amount: 611100,
    sales_price: 873000,
    title_status: 'Requested',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 740,
    condo_name: 'Flow House',
    subject_address_1: '697 N Miami Avenue',
    subject_address_2: '3308',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33132',
    lender_loan_number: '1123810'
  },
  {
    mb_loan_number: '15046363',
    first_name: 'Rahul',
    last_name: 'Kommineni',
    close_date: '2025-12-12',
    loan_status: 'AWC',
    loan_amount: 411600,
    sales_price: 686000,
    title_status: 'Requested',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 780,
    condo_name: 'Crosby',
    subject_address_1: '698 Northeast 1st Avenue',
    subject_address_2: '1609',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33132',
    lender_loan_number: '1146160'
  },
  {
    mb_loan_number: '15062626',
    first_name: 'Jordan',
    last_name: 'Ramos',
    close_date: '2025-12-15',
    loan_status: 'AWC',
    loan_amount: 261540,
    sales_price: 435900,
    title_status: null,
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 620,
    condo_name: 'District 25',
    subject_address_1: '225 Miami Avenue',
    subject_address_2: '3008',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33128',
    lender_loan_number: '1149350'
  },
  {
    mb_loan_number: '14850437',
    first_name: 'Dario',
    last_name: 'Occelli',
    close_date: '2025-12-15',
    loan_status: 'AWC',
    loan_amount: 254340,
    sales_price: 423900,
    title_status: null, // ON HOLD
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 750,
    condo_name: 'District 25',
    subject_address_1: '225 North Miami Avenue',
    subject_address_2: '# 2408',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33128',
    lender_loan_number: '1136600'
  },
  {
    mb_loan_number: '15414874',
    first_name: 'Josefina',
    last_name: 'Coviello',
    close_date: '2025-12-19',
    loan_status: 'AWC',
    loan_amount: 165000,
    sales_price: 220000,
    title_status: 'Received',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Approved',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: null, // N/A
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 788,
    condo_name: 'Mansfield Park',
    subject_address_1: '1925 Washington Avenue',
    subject_address_2: '#8',
    subject_city: 'Miami Beach',
    subject_state: 'FL',
    subject_zip: '33139',
    lender_loan_number: '1160169'
  },
  {
    mb_loan_number: '14712194',
    first_name: 'Alejandro',
    last_name: 'Rasic',
    close_date: '2026-01-01',
    loan_status: 'AWC',
    loan_amount: 266000,
    sales_price: 532000,
    title_status: null, // ON HOLD
    hoi_status: null, 
    appraisal_status: null, // ON HOLD
    condo_status: null, // ON HOLD
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: null,
    condo_name: 'The Standard',
    subject_address_1: '90 Northeast 32nd Street',
    subject_address_2: '1118',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33127',
    lender_loan_number: '1137285'
  },
  {
    mb_loan_number: '15016858',
    first_name: 'Sundeep',
    last_name: 'Sayapneni',
    close_date: '2026-01-09',
    loan_status: 'AWC',
    loan_amount: 276000,
    sales_price: 460000,
    title_status: 'Requested',
    hoi_status: 'Received',
    appraisal_status: 'Received',
    condo_status: 'Received',
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: 'Signed',
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: 789,
    condo_name: 'Crosby',
    subject_address_1: '698 Northeast 1st Avenue',
    subject_address_2: '910',
    subject_city: 'Miami',
    subject_state: 'FL',
    subject_zip: '33132',
    lender_loan_number: '1154670'
  },
  {
    // INCOMING - Cullen Mahoney
    mb_loan_number: null,
    first_name: 'Cullen',
    last_name: 'Mahoney',
    close_date: '2025-12-15',
    loan_status: 'SUB',
    loan_amount: 960000,
    sales_price: 1350000,
    title_status: null,
    hoi_status: null,
    appraisal_status: 'Scheduled',
    condo_status: null,
    cd_status: null,
    package_status: null,
    disclosure_status: 'Signed',
    ba_status: null,
    epo_status: null,
    interest_rate: null,
    lock_expiration_date: null,
    fico_score: null,
    condo_name: null,
    subject_address_1: '377 22ND AVE SE',
    subject_address_2: null,
    subject_city: 'St. Petersburg',
    subject_state: 'FL',
    subject_zip: '33705',
    lender_loan_number: '6191711940',
    is_new: true,
    lender_name: 'PENNYMAC'
  }
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const results: any[] = []
    const errors: any[] = []

    // Get lender mappings
    const { data: lenders } = await supabase.from('lenders').select('id, lender_name')
    const lenderMap: Record<string, string> = {}
    lenders?.forEach((l: any) => {
      lenderMap[l.lender_name.toUpperCase()] = l.id
    })

    // Get Active pipeline stage ID
    const { data: stages } = await supabase.from('pipeline_stages').select('id, name')
    const activePipelineId = stages?.find((s: any) => s.name === 'Active')?.id

    for (const loan of activeLoansData) {
      try {
        if (loan.mb_loan_number) {
          // Update existing loan by mb_loan_number
          const updateData: any = {}
          
          if (loan.close_date) updateData.close_date = loan.close_date
          if (loan.loan_status) updateData.loan_status = loan.loan_status
          if (loan.loan_amount) updateData.loan_amount = loan.loan_amount
          if (loan.sales_price) updateData.sales_price = loan.sales_price
          if (loan.title_status) updateData.title_status = loan.title_status
          if (loan.hoi_status) updateData.hoi_status = loan.hoi_status
          if (loan.appraisal_status) updateData.appraisal_status = loan.appraisal_status
          if (loan.condo_status) updateData.condo_status = loan.condo_status
          if (loan.cd_status) updateData.cd_status = loan.cd_status
          if (loan.package_status) updateData.package_status = loan.package_status
          if (loan.disclosure_status) updateData.disclosure_status = loan.disclosure_status
          if (loan.ba_status) updateData.ba_status = loan.ba_status
          if (loan.epo_status) updateData.epo_status = loan.epo_status
          if (loan.interest_rate) updateData.interest_rate = loan.interest_rate
          if (loan.lock_expiration_date) updateData.lock_expiration_date = loan.lock_expiration_date
          if (loan.fico_score) updateData.fico_score = loan.fico_score
          if (loan.condo_name) updateData.condo_name = loan.condo_name
          if (loan.subject_address_1) updateData.subject_address_1 = loan.subject_address_1
          if (loan.subject_address_2) updateData.subject_address_2 = loan.subject_address_2
          if (loan.subject_city) updateData.subject_city = loan.subject_city
          if (loan.subject_state) updateData.subject_state = loan.subject_state
          if (loan.subject_zip) updateData.subject_zip = loan.subject_zip
          if (loan.lender_loan_number) updateData.lender_loan_number = loan.lender_loan_number

          const { data, error } = await supabase
            .from('leads')
            .update(updateData)
            .eq('mb_loan_number', loan.mb_loan_number)
            .select('id, first_name, last_name')

          if (error) {
            errors.push({ loan: loan.mb_loan_number, error: error.message })
          } else if (data && data.length > 0) {
            results.push({ 
              action: 'updated', 
              mb_loan_number: loan.mb_loan_number,
              name: `${data[0].first_name} ${data[0].last_name}`
            })
          } else {
            errors.push({ loan: loan.mb_loan_number, error: 'No matching record found' })
          }
        } else if ((loan as any).is_new) {
          // Check if lead already exists by name
          const { data: existing } = await supabase
            .from('leads')
            .select('id')
            .eq('first_name', loan.first_name)
            .eq('last_name', loan.last_name)
            .single()

          if (!existing) {
            // Create new lead
            const lenderId = lenderMap[(loan as any).lender_name?.toUpperCase() || '']
            
            const { data: accountData } = await supabase
              .from('accounts')
              .select('id')
              .limit(1)
              .single()

            const { data: userData } = await supabase
              .from('users')
              .select('id')
              .limit(1)
              .single()

            if (accountData && userData && activePipelineId) {
              const newLead = {
                first_name: loan.first_name,
                last_name: loan.last_name,
                close_date: loan.close_date,
                loan_status: loan.loan_status,
                loan_amount: loan.loan_amount,
                sales_price: loan.sales_price,
                appraisal_status: loan.appraisal_status,
                disclosure_status: loan.disclosure_status,
                subject_address_1: loan.subject_address_1,
                subject_city: loan.subject_city,
                subject_state: loan.subject_state,
                subject_zip: loan.subject_zip,
                lender_loan_number: loan.lender_loan_number,
                lender_id: lenderId,
                pipeline_stage_id: activePipelineId,
                account_id: accountData.id,
                created_by: userData.id,
                lead_on_date: new Date().toISOString().split('T')[0]
              }

              const { data, error } = await supabase
                .from('leads')
                .insert(newLead)
                .select('id, first_name, last_name')

              if (error) {
                errors.push({ loan: `${loan.first_name} ${loan.last_name}`, error: error.message })
              } else {
                results.push({ 
                  action: 'created', 
                  name: `${loan.first_name} ${loan.last_name}`
                })
              }
            }
          } else {
            results.push({ 
              action: 'skipped (already exists)', 
              name: `${loan.first_name} ${loan.last_name}`
            })
          }
        }
      } catch (e: any) {
        errors.push({ loan: loan.mb_loan_number || loan.first_name, error: e.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: results.filter(r => r.action === 'updated').length,
        created: results.filter(r => r.action === 'created').length,
        results, 
        errors 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
