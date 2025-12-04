import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Condos to create
const condosData = [
  { condo_name: 'District 25', street_address: '225 N Miami Avenue', city: 'Miami', state: 'FL', zip: '33128' },
  { condo_name: 'Crosby', street_address: '698 NE 1st Avenue', city: 'Miami', state: 'FL', zip: '33132' },
  { condo_name: 'Decoplage', street_address: '100 Lincoln Road', city: 'Miami Beach', state: 'FL', zip: '33139' },
  { condo_name: 'Flow House', street_address: '697 N Miami Avenue', city: 'Miami', state: 'FL', zip: '33132' },
  { condo_name: 'Infinity At Brickell', street_address: '60 SW 13th St', city: 'Miami', state: 'FL', zip: '33130' },
  { condo_name: 'Nob Hill', street_address: '7980 North Nob Hill Road', city: 'Tamarac', state: 'FL', zip: '33321' },
  { condo_name: 'Residence on Monroe', street_address: '1850 Monroe St', city: 'Hollywood', state: 'FL', zip: '33020' },
  { condo_name: 'The Club at Brickell Bay', street_address: '1200 Brickell Bay Dr', city: 'Miami', state: 'FL', zip: '33131' },
  { condo_name: 'The Standard', street_address: '90 NE 32nd Street', city: 'Miami', state: 'FL', zip: '33127' },
  { condo_name: 'Mansfield Park', street_address: '1925 Washington Avenue', city: 'Miami Beach', state: 'FL', zip: '33139' },
];

// Buyer agents to update (existing) or create
const buyerAgentsData = [
  { first_name: 'Karen', last_name: 'Elmir', phone: '17863012220', email: 'lemir@onesothebysrealty.com', brokerage: 'One Sothebys Realty' },
  { first_name: 'Evan', last_name: 'Schechtman', phone: '18569389213', email: 'evan@blackbookproperties.com', brokerage: 'Black Book Properties' },
  { first_name: 'Andre', last_name: 'Martins', phone: '13057100220', email: 'almartinsrealtor@gmail.com', brokerage: 'Independent' },
  { first_name: 'Jackeline', last_name: 'Londono', phone: '13053453738', email: 'jlondono@morganwhitney.com', brokerage: 'Morgan Whitney' },
  { first_name: 'Khloe', last_name: 'Guerra', phone: '12103858303', email: 'khloe.guerra@elliman.com', brokerage: 'Douglas Elliman' },
  { first_name: 'Monserrat', last_name: 'Cardoso', phone: '13055192271', email: '', brokerage: 'Independent' },
  { first_name: 'Josefina', last_name: 'Coviello', phone: '17863188502', email: 'josefinacoviello@gmail.com', brokerage: 'Independent' },
  { first_name: 'Vanessa', last_name: 'Miami Residential', phone: '', email: 'vanessa@miamiresidential.com', brokerage: 'Miami Residential' },
];

// Listing agents to create
const listingAgentsData = [
  { first_name: 'Sarah', last_name: 'Desamours', phone: '13054331639', email: 'sarah@sdgroupmiami.com', brokerage: 'SD Group Miami' },
  { first_name: 'Patricia', last_name: 'Rapan', phone: '13052150030', email: 'patricia@patriciarapan.com', brokerage: 'Patricia Rapan Realty' },
  { first_name: 'Karl', last_name: 'De Borbon', phone: '3054406227', email: 'karl.de.borbon@gmail.com', brokerage: 'Independent' },
  { first_name: 'Adriana', last_name: 'Faerman', phone: '3057730253', email: 'adriana.faerman@compass.com', brokerage: 'Compass' },
  { first_name: 'Ramon', last_name: 'Rodriguez', phone: '', email: '', brokerage: 'Independent' },
];

// LIVE LOANS (19)
const liveLoansData = [
  {
    first_name: 'Anil', last_name: 'Potluri', email: 'pvanil@yahoo.com', phone: '18608697020',
    dob: '1973-08-15', borrower_current_address: '17 Hibiscus Way, Nashua, NH 03062, USA',
    subject_address_1: '225 N Miami Avenue', subject_address_2: '#2012', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33128',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '14752473', lender_name: 'A&D',
    loan_amount: 400140, sales_price: 666900, close_date: '2025-12-03', interest_rate: 6.375, term: '30',
    lock_expiration_date: '2025-12-18', piti: 5134.45, program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'CLOSING DAY!', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved', package_status: 'Final', ba_status: 'Signed',
    appraisal_ordered_date: '2025-09-11', appraisal_value: '730000', condo_name: 'District 25',
    buyer_agent_name: 'Karen Elmir', fico_score: 780, total_monthly_income: 12916.67, down_pmt: '266760', monthly_liabilities: 1000
  },
  {
    first_name: 'Sheela', last_name: 'Vallabhaneni', email: 'sheelavallabhaneni@gmail.com', phone: '5132897381',
    dob: '1974-06-29', borrower_current_address: '12181 Compassplant Drive, Frisco, TX 75035, USA',
    subject_address_1: '225 North Miami Avenue', subject_address_2: '#1501', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33128',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '14772662', lender_name: 'DEEPHAVEN',
    loan_amount: 397140, sales_price: 661900, close_date: '2025-12-03', interest_rate: 6.99, term: '360',
    lock_expiration_date: '2025-12-12', piti: 5411.52, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received', ba_status: 'Signed', epo_status: 'Signed',
    appraisal_value: '675000', condo_name: 'District 25',
    buyer_agent_name: 'Karen Elmir', fico_score: 734, total_monthly_income: 32933.33, down_pmt: '264760', monthly_liabilities: 6899
  },
  {
    first_name: 'Sheela', last_name: 'Vallabhaneni', email: 'sheelavallabhaneni@gmail.com', phone: '5132897381',
    dob: '1974-06-29', borrower_current_address: '12181 Compassplant Drive',
    subject_address_1: '698 NE 1st Avenue', subject_address_2: '2104', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33132',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15107908', lender_name: 'A&D',
    loan_amount: 292800, sales_price: 488000, close_date: '2025-12-04', interest_rate: 6.99, term: '360',
    lock_expiration_date: '2026-01-02', program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved', ba_status: 'Signed',
    appraisal_value: '555000', condo_name: 'Crosby',
    buyer_agent_name: 'Karen Elmir', down_pmt: '195200'
  },
  {
    first_name: 'Yoseph', last_name: 'Cetton', email: 'flduct@gmail.com', phone: '19545137777',
    dob: '1962-03-17', subject_address_1: '7980 North Nob Hill Road', subject_address_2: '203',
    subject_city: 'Tamarac', subject_state: 'FL', subject_zip: '33321',
    property_type: 'SFR', occupancy: 'Investment', mb_loan_number: '14548295', lender_name: 'A&D',
    loan_amount: 175000, close_date: '2025-12-05', interest_rate: 6.625, term: '360',
    lock_expiration_date: '2025-12-15', piti: 18007, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved',
    appraisal_value: '248000', condo_name: 'Nob Hill', fico_score: 740
  },
  {
    first_name: 'Pallavi', last_name: 'Rayapu', email: 'pallavirayapu@gmail.com', phone: '5133441836',
    dob: '1987-06-26', borrower_current_address: '5999 Maxfli Lane, Mason, OH 45040, USA',
    subject_address_1: '601 North Miami Avenue', subject_address_2: '#2005', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33132',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15135797', lender_name: 'A&D',
    loan_amount: 301200, sales_price: 502000, close_date: '2025-12-05', interest_rate: 6.625, term: '30',
    lock_expiration_date: '2025-12-19', piti: 3406.18, program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'CTC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved', package_status: 'Initial', ba_status: 'Signed', epo_status: 'Signed',
    appraisal_value: '525000', condo_name: 'Crosby',
    fico_score: 792, total_monthly_income: 10583, down_pmt: '200800', monthly_liabilities: 1000
  },
  {
    first_name: 'Nicholas', last_name: 'Burchill', email: 'nicholasburchill@gmail.com', phone: '12032869775',
    subject_address_1: '60 SW 13th St', subject_address_2: '#1805', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33130',
    property_type: 'Condo', occupancy: 'Primary Residence', mb_loan_number: '15181642', lender_name: 'CHAMPIONS',
    loan_amount: 325600, sales_price: 407000, close_date: '2025-12-08', interest_rate: 10, term: '360',
    lock_expiration_date: '2025-12-12', piti: 4050, program: 'NIP',
    disclosure_status: 'Signed', loan_status: 'CTC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved', cd_status: 'Signed', ba_status: 'Signed', epo_status: 'Signed',
    appraisal_value: '415000', condo_name: 'Infinity At Brickell',
    buyer_agent_name: 'Khloe Guerra', listing_agent_name: 'Sarah Desamours',
    fico_score: 766, down_pmt: '20000', monthly_liabilities: 65
  },
  {
    first_name: 'Myles', last_name: 'Munroe', phone: '12423766990',
    dob: '1984-01-11', borrower_current_address: '36 Concord Drive, Nassau, PO Box CB13070, Bahamas',
    subject_address_1: '697 N Miami Avenue', subject_address_2: '3308', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33132',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '13623776', lender_name: 'A&D',
    loan_amount: 611100, sales_price: 873000, close_date: '2025-12-10', piti: 6271.64, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Requested', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received', ba_status: 'Signed',
    appraisal_value: '873000', condo_name: 'Flow House',
    buyer_agent_name: 'Evan Schechtman', fico_score: 740, total_monthly_income: 45416.67, down_pmt: '261900'
  },
  {
    first_name: 'Geetha', last_name: 'Samkuratri', email: 'gsankur@gmail.com', phone: '14693468607',
    dob: '1972-06-09', borrower_current_address: '536 S Pearl Expy Dallas, TX. 75201',
    subject_address_1: '225 North Miami Avenue', subject_address_2: '#1405', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33128',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '14759707', lender_name: 'DEEPHAVEN',
    loan_amount: 421740, sales_price: 702900, close_date: '2025-12-12', interest_rate: 6.875, term: '30',
    lock_expiration_date: '2025-12-22', piti: 5336, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'CTC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved', package_status: 'Final', epo_status: 'N/A', ba_status: 'Signed',
    appraisal_value: '703000', condo_name: 'District 25',
    buyer_agent_name: 'Andre Martins', fico_score: 780, total_monthly_income: 28166.67, down_pmt: '280800'
  },
  {
    first_name: 'Diana', last_name: 'Alzate', email: 'dalzate@hotmail.com', phone: '7866319846',
    dob: '1968-01-19', borrower_current_address: '855 Bayside Lane, Weston, FL 33326, USA',
    subject_address_1: '100 Lincoln Road', subject_address_2: '#304', subject_city: 'Miami Beach', subject_state: 'FL', subject_zip: '33139',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15173011', lender_name: 'A&D',
    loan_amount: 183750, sales_price: 262500, close_date: '2025-12-12', interest_rate: 6.625, term: '360',
    lock_expiration_date: '2025-12-12', piti: 2141.04, program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'CTC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Transfer', package_status: 'Final', ba_status: 'Signed', epo_status: 'Signed',
    condo_name: 'Decoplage',
    buyer_agent_name: 'Jackeline Londono', listing_agent_name: 'Patricia Rapan',
    fico_score: 733, total_monthly_income: 143, down_pmt: '78750', monthly_liabilities: 3163
  },
  {
    first_name: 'Daniel', last_name: 'Faltas', phone: '18482199757',
    dob: '1976-09-20', borrower_current_address: '200 Leslie Drive UNIT 606 Hallandale Beach FL 33009',
    subject_address_1: '1850 Monroe St.', subject_address_2: '#409', subject_city: 'Hollywood', subject_state: 'FL', subject_zip: '33020',
    property_type: 'Condo', occupancy: 'Primary', mb_loan_number: '13869119', lender_name: 'PENNYMAC',
    loan_amount: 513750, sales_price: 685000, close_date: '2025-12-12', term: '360', piti: 5280.22, program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'SUB', title_status: 'Requested', hoi_status: 'Received',
    appraisal_status: 'Waiver', condo_status: 'Pending Order', ba_status: 'Signed',
    appraisal_value: '650000', condo_name: 'Residence on Monroe',
    buyer_agent_name: 'Monserrat Cardoso', fico_score: 751, total_monthly_income: 15925, down_pmt: '171250', monthly_liabilities: 4886.15
  },
  {
    first_name: 'Mohamed', last_name: 'Rasmy', email: 'mrasmy88@hotmail.com', phone: '4076249996',
    borrower_current_address: '1057 Glenharbor Circle',
    subject_address_1: '1057 Glenharbor Circle', subject_city: 'Winter Garden', subject_state: 'FL',
    property_type: 'Single Family', occupancy: 'Primary Residence', mb_loan_number: '12807701', lender_name: 'A&D',
    loan_amount: 215000, sales_price: 512000, close_date: '2025-12-12', term: '360', piti: 3370.42, program: 'Bank Statement',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', escrow_waiver: 'Yes',
    appraisal_value: '468000', total_monthly_income: 9666.67
  },
  {
    first_name: 'Rahul', last_name: 'Kommineni', email: 'rahul.kommineni@gmail.com', phone: '3145375952',
    dob: '1974-03-08', borrower_current_address: '7004 Seminary Ridge Court',
    subject_address_1: '698 Northeast 1st Avenue', subject_address_2: '1609', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33132',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15046363', lender_name: 'A&D',
    loan_amount: 411600, sales_price: 686000, close_date: '2025-12-12', piti: 4230.74, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Requested', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received', ba_status: 'Signed',
    appraisal_value: '710000', condo_name: 'Crosby',
    buyer_agent_name: 'Karen Elmir', fico_score: 780, total_monthly_income: 41918, down_pmt: '274400', monthly_liabilities: 6112
  },
  {
    first_name: 'Jason', last_name: 'Jerald', email: 'thejasonjerald@gmail.com', phone: '9843038175',
    dob: '1974-04-26', borrower_current_address: '230 Northeast 4th Street',
    subject_address_1: '1200 Brickell Bay Dr', subject_address_2: '#2821', subject_city: 'Miami', subject_state: 'FL',
    property_type: 'Condo', occupancy: 'Primary', mb_loan_number: '15417922', lender_name: 'A&D',
    loan_amount: 352000, sales_price: 440000, close_date: '2025-12-15', interest_rate: 6.625, term: '30',
    lock_expiration_date: '2025-12-26', piti: 3676, program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received',
    appraisal_value: '450000', condo_name: 'The Club at Brickell Bay',
    buyer_agent_name: 'Evan Schechtman', listing_agent_name: 'Karl De Borbon',
    fico_score: 759, total_monthly_income: 12765.8, down_pmt: '112500', monthly_liabilities: 199
  },
  {
    first_name: 'Rayza', last_name: 'Occelli', email: 'rayza_occelli@hotmail.com', phone: '3059157423',
    dob: '1991-02-23', borrower_current_address: '1001 Northwest 7th Street',
    subject_address_1: '225 Miami Avenue', subject_address_2: '3008', subject_city: 'Miami', subject_state: 'FL',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15062626', lender_name: 'A&D',
    loan_amount: 261540, sales_price: 435900, close_date: '2025-12-15', piti: 2644.55, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received', ba_status: 'Signed',
    condo_name: 'District 25',
    buyer_agent_name: 'Andre Martins', fico_score: 620, total_monthly_income: 6666.68, down_pmt: '174360', monthly_liabilities: 207
  },
  {
    first_name: 'Dario', last_name: 'Occelli', email: 'dario.occellijr@gmail.com', phone: '3059043378',
    dob: '2002-05-21',
    subject_address_1: '225 North Miami Avenue', subject_address_2: '# 2408', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33128',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '14850437', lender_name: 'A&D',
    loan_amount: 254340, sales_price: 423900, close_date: '2025-12-15', program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'On Hold', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received', ba_status: 'Signed',
    appraisal_value: '445000', condo_name: 'District 25',
    buyer_agent_name: 'Andre Martins', fico_score: 750, total_monthly_income: 6516.67, down_pmt: '169560'
  },
  {
    first_name: 'Cullen', last_name: 'Mahoney', email: 'cullen@soduscapital.com', phone: '3058493959',
    borrower_current_address: '377 22nd Avenue SE',
    subject_address_1: '377 22ND AVE SE', subject_city: 'St. Petersburg', subject_state: 'FL',
    property_type: 'Single Family', occupancy: 'Primary', lender_name: 'PENNYMAC',
    loan_amount: 960000, sales_price: 1350000, close_date: '2025-12-15', piti: 9304.13,
    loan_status: 'SUB', hoi_status: 'Scheduled',
    total_monthly_income: 4000000
  },
  {
    first_name: 'Josefina', last_name: 'Coviello', email: 'josefinacoviello@gmail.com', phone: '7863188502',
    dob: '1979-07-03', borrower_current_address: '7549 Adventure Avenue',
    subject_address_1: '1925 Washington Avenue', subject_address_2: '#8', subject_city: 'Miami Beach', subject_state: 'FL',
    property_type: 'Condominium', occupancy: 'Investment', mb_loan_number: '15414874', lender_name: 'A&D',
    loan_amount: 165000, sales_price: 220000, close_date: '2025-12-19', interest_rate: 6.99, term: '30',
    lock_expiration_date: '2026-01-02', piti: 2030.25, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Approved', escrow_waiver: 'Yes',
    appraisal_value: '225000', condo_name: 'Mansfield Park',
    buyer_agent_name: 'Josefina Coviello', listing_agent_name: 'Adriana Faerman',
    fico_score: 788, total_monthly_income: 10000, down_pmt: '66000'
  },
  {
    first_name: 'Alejandro', last_name: 'Rasic', email: 'alerasic@gmail.com', phone: '17867952224',
    dob: '1972-12-09', borrower_current_address: '1000 Brickell Plaza, Miami, FL 33131, USA',
    subject_address_1: '90 Northeast 32nd Street', subject_address_2: '1118', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33127',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '14712194', lender_name: 'A&D',
    loan_amount: 266000, sales_price: 532000, close_date: '2026-01-01', term: '360', piti: 4073, program: 'Conventional',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'On Hold',
    appraisal_status: 'On Hold', condo_status: 'On Hold', ba_status: 'Signed',
    condo_name: 'The Standard', listing_agent_name: 'Ramon Rodriguez',
    total_monthly_income: 29832, down_pmt: '266000', monthly_liabilities: 750
  },
  {
    first_name: 'Sundeep', last_name: 'Sayapneni', email: 'sundeep.meher@gmail.com', phone: '5624536124',
    dob: '1988-07-31', borrower_current_address: '2937 Count Fleet Way, Celina, TX 75009, USA',
    subject_address_1: '698 Northeast 1st Avenue', subject_address_2: '910', subject_city: 'Miami', subject_state: 'FL', subject_zip: '33132',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15016858', lender_name: 'A&D',
    loan_amount: 276000, sales_price: 460000, close_date: '2026-01-09', term: '360', piti: 3082.74, program: 'DSCR',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Requested', hoi_status: 'Received',
    appraisal_status: 'Received', condo_status: 'Received', ba_status: 'Signed',
    appraisal_value: '505000', condo_name: 'Crosby',
    buyer_agent_name: 'Karen Elmir', fico_score: 789, total_monthly_income: 14416.67, down_pmt: '184000', monthly_liabilities: 1000
  },
];

// INCOMING LOANS (5)
const incomingLoansData = [
  {
    first_name: 'Jackeline', last_name: 'Londono', email: 'jlondono@morganwhitney.com', phone: '3053453738',
    dob: '1966-11-02', borrower_current_address: '628 Aledo Avenue, Coral Gables, FL 33134, USA',
    subject_address_1: '100 Lincoln Road', subject_address_2: '1609', subject_city: 'Miami Beach', subject_state: 'FL', subject_zip: '33139',
    property_type: 'Condo', occupancy: 'Investment', mb_loan_number: '15129091', lender_name: 'A&D',
    loan_amount: 269500, sales_price: 350000, close_date: '2025-11-28', interest_rate: 7.375, term: '360',
    lock_expiration_date: '2025-11-21', piti: 2587.81, program: 'Bank Statement',
    disclosure_status: 'Signed', loan_status: 'AWC', title_status: 'Received', hoi_status: 'Ordered',
    appraisal_status: 'Received', condo_status: 'Transfer', ba_status: 'Signed', epo_status: 'Signed',
    appraisal_value: '330000', condo_name: 'Decoplage',
    fico_score: 698, total_monthly_income: 110049
  },
  {
    first_name: 'Jose', last_name: 'Marquez', email: 'anya@wuollet.com', phone: '7868778996',
    subject_address_1: '495 Brickell Avenue', subject_address_2: '921 (BAY906)', subject_city: 'Miami', subject_state: 'FL',
    property_type: 'Single Family', occupancy: 'Investment',
    sales_price: 1205000, piti: 20667.12, program: 'Conventional',
    total_monthly_income: 58333.33, monthly_liabilities: 652
  },
  {
    first_name: 'Gaurav', last_name: 'Sharma', email: 'gwsharma110@gmail.com', phone: '7328876053',
    borrower_current_address: '350 South Miami Avenue',
    subject_address_1: '77 SE 5th Street', subject_address_2: '1814', subject_city: 'Miami', subject_state: 'FL',
    property_type: 'Condo', occupancy: 'Primary Residence', mb_loan_number: '15511744', lender_name: 'PENNYMAC',
    loan_amount: 560000, sales_price: 800000, close_date: '2026-01-31', piti: 5935,
    buyer_agent_email: 'vanessa@miamiresidential.com',
    total_monthly_income: 43000, down_pmt: '240000', monthly_liabilities: 6437
  },
];

// Enum value mappings (Monday.com → BoltCRM)
const loanStatusMap: Record<string, string> = {
  'CLOSING DAY!': 'CTC',
};
const condoStatusMap: Record<string, string> = {
  'Transfer': 'Received',
  'Pending Order': 'Ordered',
  'On Hold': 'Ordered',
};
const hoiStatusMap: Record<string, string> = {
  'Scheduled': 'Ordered',
  'Waiver': 'Received',
};
const titleStatusMap: Record<string, string> = {
  'On Hold': 'Requested',
};
const appraisalStatusMap: Record<string, string> = {
  'On Hold': 'Ordered',
};
const epoStatusMap: Record<string, string> = {
  'N/A': null as any, // Skip N/A for epo_status
};

function mapEnumValue(value: string | undefined, mapping: Record<string, string>): string | null | undefined {
  if (!value) return undefined;
  if (mapping.hasOwnProperty(value)) {
    return mapping[value];
  }
  return value;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const results = {
      condos: { created: 0, updated: 0, errors: [] as string[] },
      buyerAgents: { created: 0, updated: 0, errors: [] as string[] },
      listingAgents: { created: 0, updated: 0, errors: [] as string[] },
      liveLoans: { updated: 0, created: 0, errors: [] as string[] },
      incomingLoans: { updated: 0, created: 0, errors: [] as string[] },
    };

    // Step 1: Create/update condos
    console.log('Step 1: Creating/updating condos...');
    const condoMap: Record<string, string> = {};
    for (const condo of condosData) {
      const { data: existing } = await supabase
        .from('condos')
        .select('id')
        .ilike('condo_name', condo.condo_name)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('condos')
          .update({ street_address: condo.street_address, city: condo.city, state: condo.state, zip: condo.zip })
          .eq('id', existing.id);
        if (error) results.condos.errors.push(`Update ${condo.condo_name}: ${error.message}`);
        else results.condos.updated++;
        condoMap[condo.condo_name] = existing.id;
      } else {
        const { data: newCondo, error } = await supabase
          .from('condos')
          .insert(condo)
          .select('id')
          .single();
        if (error) results.condos.errors.push(`Create ${condo.condo_name}: ${error.message}`);
        else {
          results.condos.created++;
          condoMap[condo.condo_name] = newCondo.id;
        }
      }
    }
    console.log(`Condos: ${results.condos.created} created, ${results.condos.updated} updated`);

    // Step 2: Create/update buyer agents
    console.log('Step 2: Creating/updating buyer agents...');
    const buyerAgentMap: Record<string, string> = {};
    for (const agent of buyerAgentsData) {
      const { data: existing } = await supabase
        .from('buyer_agents')
        .select('id')
        .ilike('first_name', agent.first_name)
        .ilike('last_name', agent.last_name)
        .maybeSingle();

      if (existing) {
        const updateData: any = { brokerage: agent.brokerage };
        if (agent.phone) updateData.phone = agent.phone;
        if (agent.email) updateData.email = agent.email;
        const { error } = await supabase.from('buyer_agents').update(updateData).eq('id', existing.id);
        if (error) results.buyerAgents.errors.push(`Update ${agent.first_name} ${agent.last_name}: ${error.message}`);
        else results.buyerAgents.updated++;
        buyerAgentMap[`${agent.first_name} ${agent.last_name}`] = existing.id;
      } else {
        const { data: newAgent, error } = await supabase
          .from('buyer_agents')
          .insert(agent)
          .select('id')
          .single();
        if (error) results.buyerAgents.errors.push(`Create ${agent.first_name} ${agent.last_name}: ${error.message}`);
        else {
          results.buyerAgents.created++;
          buyerAgentMap[`${agent.first_name} ${agent.last_name}`] = newAgent.id;
        }
      }
    }
    console.log(`Buyer Agents: ${results.buyerAgents.created} created, ${results.buyerAgents.updated} updated`);

    // Step 3: Create listing agents
    console.log('Step 3: Creating listing agents...');
    const listingAgentMap: Record<string, string> = {};
    for (const agent of listingAgentsData) {
      const { data: existing } = await supabase
        .from('buyer_agents')
        .select('id')
        .ilike('first_name', agent.first_name)
        .ilike('last_name', agent.last_name)
        .maybeSingle();

      if (existing) {
        listingAgentMap[`${agent.first_name} ${agent.last_name}`] = existing.id;
        results.listingAgents.updated++;
      } else {
        const { data: newAgent, error } = await supabase
          .from('buyer_agents')
          .insert(agent)
          .select('id')
          .single();
        if (error) results.listingAgents.errors.push(`Create ${agent.first_name} ${agent.last_name}: ${error.message}`);
        else {
          results.listingAgents.created++;
          listingAgentMap[`${agent.first_name} ${agent.last_name}`] = newAgent.id;
        }
      }
    }
    console.log(`Listing Agents: ${results.listingAgents.created} created, ${results.listingAgents.updated} existing`);

    // Step 4: Get lender IDs
    console.log('Step 4: Getting lender IDs...');
    const { data: lenders } = await supabase.from('lenders').select('id, lender_name');
    const lenderMap: Record<string, string> = {};
    lenders?.forEach(l => {
      if (l.lender_name?.toUpperCase().includes('A&D')) lenderMap['A&D'] = l.id;
      if (l.lender_name?.toUpperCase().includes('DEEPHAVEN')) lenderMap['DEEPHAVEN'] = l.id;
      if (l.lender_name?.toUpperCase().includes('CHAMPIONS')) lenderMap['CHAMPIONS'] = l.id;
      if (l.lender_name?.toUpperCase().includes('PENNYMAC')) lenderMap['PENNYMAC'] = l.id;
    });
    console.log('Lender map:', lenderMap);

    // Step 5: Get Active pipeline stage ID
    const { data: activeStage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('name', 'Active')
      .single();
    const activeStageId = activeStage?.id;
    console.log('Active stage ID:', activeStageId);

    // Get account_id for new leads
    const { data: accountData } = await supabase.from('accounts').select('id').limit(1).single();
    const accountId = accountData?.id;

    // Helper function to update a loan
    async function updateLoan(loan: any, pipelineSection: string): Promise<{ success: boolean; error?: string }> {
      // Find existing lead by mb_loan_number OR by name+email
      let existingLead: any = null;
      
      if (loan.mb_loan_number) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .eq('mb_loan_number', loan.mb_loan_number)
          .maybeSingle();
        existingLead = data;
      }
      
      if (!existingLead && loan.email) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .ilike('first_name', loan.first_name)
          .ilike('last_name', loan.last_name)
          .ilike('email', loan.email)
          .maybeSingle();
        existingLead = data;
      }
      
      if (!existingLead) {
        const { data } = await supabase
          .from('leads')
          .select('id')
          .ilike('first_name', loan.first_name)
          .ilike('last_name', loan.last_name)
          .maybeSingle();
        existingLead = data;
      }

      // Build update object
      const updateData: any = {
        first_name: loan.first_name,
        last_name: loan.last_name,
        pipeline_section: pipelineSection,
      };

      // Basic info
      if (loan.email) updateData.email = loan.email;
      if (loan.phone) updateData.phone = loan.phone;
      if (loan.dob) updateData.dob = loan.dob;
      if (loan.borrower_current_address) updateData.borrower_current_address = loan.borrower_current_address;

      // Property info
      if (loan.subject_address_1) updateData.subject_address_1 = loan.subject_address_1;
      if (loan.subject_address_2) updateData.subject_address_2 = loan.subject_address_2;
      if (loan.subject_city) updateData.subject_city = loan.subject_city;
      if (loan.subject_state) updateData.subject_state = loan.subject_state;
      if (loan.subject_zip) updateData.subject_zip = loan.subject_zip;
      if (loan.property_type) updateData.property_type = loan.property_type;
      if (loan.occupancy) updateData.occupancy = loan.occupancy;

      // Loan details
      if (loan.mb_loan_number) updateData.mb_loan_number = loan.mb_loan_number;
      if (loan.loan_amount) updateData.loan_amount = loan.loan_amount;
      if (loan.sales_price) updateData.sales_price = loan.sales_price;
      if (loan.close_date) updateData.close_date = loan.close_date;
      if (loan.interest_rate) updateData.interest_rate = loan.interest_rate;
      if (loan.term) updateData.term = loan.term;
      if (loan.lock_expiration_date) updateData.lock_expiration_date = loan.lock_expiration_date;
      if (loan.piti) updateData.piti = loan.piti;
      if (loan.program) updateData.program = loan.program;

      // Status fields (with enum value mapping)
      if (loan.disclosure_status) updateData.disclosure_status = loan.disclosure_status;
      const mappedLoanStatus = mapEnumValue(loan.loan_status, loanStatusMap);
      if (mappedLoanStatus) updateData.loan_status = mappedLoanStatus;
      const mappedTitleStatus = mapEnumValue(loan.title_status, titleStatusMap);
      if (mappedTitleStatus) updateData.title_status = mappedTitleStatus;
      const mappedHoiStatus = mapEnumValue(loan.hoi_status, hoiStatusMap);
      if (mappedHoiStatus) updateData.hoi_status = mappedHoiStatus;
      const mappedAppraisalStatus = mapEnumValue(loan.appraisal_status, appraisalStatusMap);
      if (mappedAppraisalStatus) updateData.appraisal_status = mappedAppraisalStatus;
      const mappedCondoStatus = mapEnumValue(loan.condo_status, condoStatusMap);
      if (mappedCondoStatus) updateData.condo_status = mappedCondoStatus;
      if (loan.package_status) updateData.package_status = loan.package_status;
      if (loan.cd_status) updateData.cd_status = loan.cd_status;
      if (loan.ba_status) updateData.ba_status = loan.ba_status;
      const mappedEpoStatus = mapEnumValue(loan.epo_status, epoStatusMap);
      if (mappedEpoStatus) updateData.epo_status = mappedEpoStatus;

      // Appraisal details
      if (loan.appraisal_ordered_date) updateData.appraisal_ordered_date = loan.appraisal_ordered_date;
      if (loan.appraisal_value) updateData.appraisal_value = loan.appraisal_value;

      // Financial info
      if (loan.fico_score) updateData.fico_score = loan.fico_score;
      if (loan.total_monthly_income) updateData.total_monthly_income = loan.total_monthly_income;
      if (loan.monthly_liabilities) updateData.monthly_liabilities = loan.monthly_liabilities;
      if (loan.down_pmt) updateData.down_pmt = loan.down_pmt;

      // Relationships
      if (loan.lender_name && lenderMap[loan.lender_name]) {
        updateData.approved_lender_id = lenderMap[loan.lender_name];
      }
      if (loan.condo_name && condoMap[loan.condo_name]) {
        updateData.condo_id = condoMap[loan.condo_name];
      }
      if (loan.buyer_agent_name && buyerAgentMap[loan.buyer_agent_name]) {
        updateData.buyer_agent_id = buyerAgentMap[loan.buyer_agent_name];
      }
      if (loan.listing_agent_name) {
        const listingId = listingAgentMap[loan.listing_agent_name] || buyerAgentMap[loan.listing_agent_name];
        if (listingId) updateData.listing_agent_id = listingId;
      }

      if (existingLead) {
        const { error } = await supabase.from('leads').update(updateData).eq('id', existingLead.id);
        if (error) return { success: false, error: error.message };
        return { success: true };
      } else {
        // Create new lead
        updateData.account_id = accountId;
        updateData.pipeline_stage_id = activeStageId;
        updateData.status = 'Working on it';
        
        const { error } = await supabase.from('leads').insert(updateData);
        if (error) return { success: false, error: error.message };
        return { success: true };
      }
    }

    // Step 6: Process LIVE loans
    console.log('Step 6: Processing LIVE loans...');
    for (const loan of liveLoansData) {
      const result = await updateLoan(loan, 'Live');
      if (result.success) {
        results.liveLoans.updated++;
      } else {
        results.liveLoans.errors.push(`${loan.first_name} ${loan.last_name}: ${result.error}`);
      }
    }
    console.log(`Live Loans: ${results.liveLoans.updated} updated`);

    // Step 7: Process INCOMING loans
    console.log('Step 7: Processing INCOMING loans...');
    for (const loan of incomingLoansData) {
      const result = await updateLoan(loan, 'Incoming');
      if (result.success) {
        results.incomingLoans.updated++;
      } else {
        results.incomingLoans.errors.push(`${loan.first_name} ${loan.last_name}: ${result.error}`);
      }
    }
    console.log(`Incoming Loans: ${results.incomingLoans.updated} updated`);

    // Summary
    const summary = {
      success: true,
      summary: {
        condos: `${results.condos.created} created, ${results.condos.updated} updated`,
        buyerAgents: `${results.buyerAgents.created} created, ${results.buyerAgents.updated} updated`,
        listingAgents: `${results.listingAgents.created} created, ${results.listingAgents.updated} existing`,
        liveLoans: `${results.liveLoans.updated} updated`,
        incomingLoans: `${results.incomingLoans.updated} updated`,
      },
      errors: {
        condos: results.condos.errors,
        buyerAgents: results.buyerAgents.errors,
        listingAgents: results.listingAgents.errors,
        liveLoans: results.liveLoans.errors,
        incomingLoans: results.incomingLoans.errors,
      },
    };

    console.log('Migration complete:', JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
