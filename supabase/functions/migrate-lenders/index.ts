import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LenderData {
  lender_name: string;
  lender_type: 'Conventional' | 'Non-QM' | 'Private';
  account_executive: string;
  account_executive_email: string;
  account_executive_phone: string;
  broker_portal_url: string;
  status: string;
}

const lendersData: LenderData[] = [
  { lender_name: 'A&D', lender_type: 'Non-QM', account_executive: 'David Wilson', account_executive_email: 'david.wilson@admortgage.com', account_executive_phone: '7866779669', broker_portal_url: 'https://aim.admortgage.com/home', status: 'Active' },
  { lender_name: 'ACRA', lender_type: 'Non-QM', account_executive: 'Christina Fairbanks', account_executive_email: 'herman@mortgagebolt.com', account_executive_phone: '14153499001', broker_portal_url: 'https://alglide.com/login', status: 'Active' },
  { lender_name: 'ADVANCIAL', lender_type: 'Conventional', account_executive: 'Courtney Mercer', account_executive_email: 'cmercer@advancialmortgage.com', account_executive_phone: '19722011782', broker_portal_url: 'https://www.advancial.org/wholesale/', status: 'Active' },
  { lender_name: 'AMWEST FUNDING GROUP', lender_type: 'Conventional', account_executive: 'Christopher Gandara', account_executive_email: 'Christopher.Gandara@amwestfunding.com', account_executive_phone: '17867683782', broker_portal_url: 'https://www.amwestwholesale.com/', status: 'Active' },
  { lender_name: 'ANGEL OAK', lender_type: 'Non-QM', account_executive: 'Scott Gruebele', account_executive_email: 'scott.gruebele@angeloakms.com', account_executive_phone: '17544235117', broker_portal_url: 'https://2884351510.encompasstpoconnect.com/', status: 'Active' },
  { lender_name: 'BAC', lender_type: 'Non-QM', account_executive: 'Baine Leon', account_executive_email: 'bleon@bradescobank.com', account_executive_phone: '3057898066', broker_portal_url: 'https://wholesale.bradescobank.com/', status: 'Active' },
  { lender_name: 'BB AMERICAS', lender_type: 'Conventional', account_executive: 'Robert Gutlohn', account_executive_email: 'wholesale@bbamericas.com', account_executive_phone: '13057948183', broker_portal_url: 'https://wholesale.bbamericas.com/', status: 'Active' },
  { lender_name: 'CHAMPIONS FUNDING', lender_type: 'Non-QM', account_executive: 'Mario Lopez', account_executive_email: 'mario@champstpo.com', account_executive_phone: '19252060537', broker_portal_url: 'https://hero.champstpo.com/Auth/Login', status: 'Active' },
  { lender_name: 'CHANGE', lender_type: 'Non-QM', account_executive: 'Carlos Cabezas', account_executive_email: 'carlos.cabezas@changewholesale.com', account_executive_phone: '13054902188', broker_portal_url: 'https://portal.changelendingllc.com/', status: 'Active' },
  { lender_name: 'CLICK N\' CLOSE', lender_type: 'Conventional', account_executive: 'Bob Paglia', account_executive_email: 'bob.paglia@clicknclose.com', account_executive_phone: '19549935002', broker_portal_url: 'https://mam.mmachine.net/LogIn.aspx', status: 'Active' },
  { lender_name: 'DEEPHAVEN', lender_type: 'Non-QM', account_executive: 'Mark Latsko', account_executive_email: 'mlatsko@deephavenmortgage.com', account_executive_phone: '17047418419', broker_portal_url: 'https://dhmwhsl.encompasstpoconnect.com/', status: 'Active' },
  { lender_name: 'EPM', lender_type: 'Conventional', account_executive: 'Brian O\'Leary', account_executive_email: 'BOLeary@epm.net', account_executive_phone: '14012069709', broker_portal_url: 'https://epmcore.com/login', status: 'Active' },
  { lender_name: 'EVERSTREAM', lender_type: 'Conventional', account_executive: 'Yvonne Rupp', account_executive_email: 'yvonne.rupp@everstreammortgage.com', account_executive_phone: '12673764366', broker_portal_url: 'https://prod.lendingpad.com/everstream/login', status: 'Active' },
  { lender_name: 'FEMBI', lender_type: 'Conventional', account_executive: 'Ed Wilburn', account_executive_email: 'ed.wilburn@fembi.com', account_executive_phone: '13055059040', broker_portal_url: 'https://brokers.fembi.com/', status: 'Active' },
  { lender_name: 'FUND LOANS', lender_type: 'Non-QM', account_executive: 'Sean Murray', account_executive_email: 'smurray@fundloans.com', account_executive_phone: '16097908806', broker_portal_url: 'https://tpo.fundloans.com/', status: 'Active' },
  { lender_name: 'JMAC Lending', lender_type: 'Conventional', account_executive: 'Michelle Smith', account_executive_email: 'michelle.smith@jmaclending.com', account_executive_phone: '17727082857', broker_portal_url: 'https://2097894541.encompasstpoconnect.com/', status: 'Active' },
  { lender_name: 'KIND LENDING', lender_type: 'Conventional', account_executive: 'Rick Fabricio', account_executive_email: 'rfabrico@kindlending.com', account_executive_phone: '13057223748', broker_portal_url: 'https://kwikie.kindlending.com/login?returnUrl=%2F', status: 'Active' },
  { lender_name: 'LEND SURE', lender_type: 'Non-QM', account_executive: 'Spencer Penrod', account_executive_email: 'spenrod@lendsure.com', account_executive_phone: '18015986927', broker_portal_url: 'https://lendsure.my.site.com/s/login/', status: 'Active' },
  { lender_name: 'LENDZ FINANCIAL', lender_type: 'Non-QM', account_executive: 'Justin Smith', account_executive_email: 'justin.smith@lendzfinancial.com', account_executive_phone: '13052046803', broker_portal_url: 'https://prod.lendingpad.com/lendz/login', status: 'Active' },
  { lender_name: 'NEW WAVE LENDING GROUP', lender_type: 'Conventional', account_executive: 'Hanh Hoang', account_executive_email: 'hanh.hoang@newwavelending.com', account_executive_phone: '16263150048', broker_portal_url: 'https://www.newwavelending.com/', status: 'Active' },
  { lender_name: 'NEWFI', lender_type: 'Non-QM', account_executive: 'Annu Gyani', account_executive_email: 'AGyani@Newfi.com', account_executive_phone: '17869109485', broker_portal_url: 'https://broker.newfiwholesale.com/index.html', status: 'Active' },
  { lender_name: 'NEWREZ', lender_type: 'Conventional', account_executive: 'Amanda Schmidt', account_executive_email: 'Amanda.Schmidt@newrez.com', account_executive_phone: '18589973003', broker_portal_url: 'https://blueprint.newrezwholesale.com/dashboard', status: 'Active' },
  { lender_name: 'PENNYMAC', lender_type: 'Conventional', account_executive: 'David Gross', account_executive_email: 'david.gross@pennymac.com', account_executive_phone: '19542880691', broker_portal_url: 'https://power.pennymac.com/#/content/home_362710', status: 'Active' },
  { lender_name: 'POWERTPO', lender_type: 'Conventional', account_executive: 'Zuly Munoz', account_executive_email: 'zmunoz@powertpo.com', account_executive_phone: '13057964765', broker_portal_url: 'https://portal.powertpo.com/', status: 'Active' },
  { lender_name: 'PRMG', lender_type: 'Conventional', account_executive: 'Charles Ryan', account_executive_email: 'CRyan@prmg.net', account_executive_phone: '14044055310', broker_portal_url: 'https://tpo.prmg.net/', status: 'Active' },
  { lender_name: 'PROVIDENT', lender_type: 'Conventional', account_executive: 'Kim Jordan', account_executive_email: 'kjordan@provident.com', account_executive_phone: '14122785974', broker_portal_url: 'https://pfloans.provident.com/v2/guidelines?src=pipeline&LoanProgram=A1010', status: 'Active' },
  { lender_name: 'REMINGTON', lender_type: 'Conventional', account_executive: 'Mark Mccullough', account_executive_email: 'mark.mccullough@remn.com', account_executive_phone: '19046076278', broker_portal_url: 'https://hub.remnwholesale.com/portal/#/login', status: 'Active' },
  { lender_name: 'SIERRA PACIFIC', lender_type: 'Conventional', account_executive: 'Fay Hoffman', account_executive_email: 'fay.hoffman@sierrapacificmortgage.com', account_executive_phone: '15109611670', broker_portal_url: 'https://www.sierrapacificmortgage.com/net/SPMLogin/?redirectURL=https:%2F%2Fwww.sierrapacificmortgage.com%2Fnet%2Fmain%2FExpressLoanLanding.ashx&ch=w', status: 'Active' },
  { lender_name: 'SPRING EQ', lender_type: 'Private', account_executive: 'Justin Sutton', account_executive_email: 'justin.sutton@springeq.com', account_executive_phone: '12677388602', broker_portal_url: 'https://wholesale.springeq.com/ratesfeesguides', status: 'Active' },
  { lender_name: 'SYMMETRY', lender_type: 'Private', account_executive: 'Jerry Sanchez', account_executive_email: 'jerry.sanchez@symmetrylending.com', account_executive_phone: '17289008994', broker_portal_url: 'https://www.mysecuredock.com/Express/landing.aspx?list=e7be3d10-fddc-4457-afc1-80a15fb7d9fe', status: 'Active' },
  { lender_name: 'THE LENDER', lender_type: 'Non-QM', account_executive: 'Chaz Scruggs', account_executive_email: 'cscruggs@thelender.com', account_executive_phone: '19494083178', broker_portal_url: 'https://6335822308.encompasstpoconnect.com', status: 'Active' },
  { lender_name: 'THE LOAN STORE', lender_type: 'Private', account_executive: 'Marcia Escobedo', account_executive_email: 'mescobedo@theloanstore.com', account_executive_phone: '19548224344', broker_portal_url: 'https://theloanstore.encompasstpoconnect.com/', status: 'Active' },
  { lender_name: 'UWM', lender_type: 'Conventional', account_executive: 'Anthony Zaitonia', account_executive_email: 'azaitonia@uwm.com', account_executive_phone: '18106507497', broker_portal_url: 'https://ease.uwm.com', status: 'Active' },
];

function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Remove leading 1 if present
  const number = cleaned.startsWith('1') && cleaned.length === 11 ? cleaned.substring(1) : cleaned;
  
  // Format as (XXX) XXX-XXXX
  if (number.length === 10) {
    return `(${number.substring(0, 3)}) ${number.substring(3, 6)}-${number.substring(6)}`;
  }
  
  return phone; // Return original if not 10 digits
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { confirm } = await req.json();

    // Preview mode
    if (!confirm) {
      const transformedLenders = lendersData.map(lender => ({
        ...lender,
        account_executive_phone: formatPhoneNumber(lender.account_executive_phone),
      }));

      return new Response(
        JSON.stringify({
          preview: true,
          message: 'Preview of lenders to be migrated',
          count: transformedLenders.length,
          lenders: transformedLenders,
          actions: {
            delete: 'All existing lenders',
            insert: `${transformedLenders.length} new lenders`
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting lenders migration...');

    // Delete all existing lenders
    console.log('Deleting existing lenders...');
    const { error: deleteError } = await supabase
      .from('lenders')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting lenders:', deleteError);
      throw deleteError;
    }

    console.log('Existing lenders deleted successfully');

    // Transform and insert new lenders
    const transformedLenders = lendersData.map(lender => ({
      lender_name: lender.lender_name,
      lender_type: lender.lender_type,
      account_executive: lender.account_executive,
      account_executive_email: lender.account_executive_email,
      account_executive_phone: formatPhoneNumber(lender.account_executive_phone),
      broker_portal_url: lender.broker_portal_url,
      status: lender.status,
    }));

    console.log(`Inserting ${transformedLenders.length} new lenders...`);
    const { data: insertedLenders, error: insertError } = await supabase
      .from('lenders')
      .insert(transformedLenders)
      .select();

    if (insertError) {
      console.error('Error inserting lenders:', insertError);
      throw insertError;
    }

    console.log(`Successfully inserted ${insertedLenders?.length || 0} lenders`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lenders migration completed successfully',
        deleted: 'All existing lenders',
        inserted: insertedLenders?.length || 0,
        lenders: insertedLenders,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
