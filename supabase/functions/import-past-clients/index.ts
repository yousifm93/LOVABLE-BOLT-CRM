import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
function parseDate(value: string | null | undefined): string | null {
  if (!value || value === '' || value === 'null') return null;
  // Handle ISO dates
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value.split('T')[0];
  }
  return null;
}

function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeTerm(value: any): number | null {
  const num = parseDecimal(value);
  if (num === null) return null;
  // If term is like 30 or 15, convert to months (assume years if > 50 means days)
  if (num <= 50) return num * 12;
  return num;
}

function mapPropertyType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper.includes('CONDO') || upper === 'CONDOMINIUM') return 'Condo';
  if (upper === 'SFR' || upper.includes('SINGLE')) return 'Single Family';
  if (upper.includes('TOWN')) return 'Townhouse';
  if (upper.includes('MULTI')) return 'Multi-Family';
  return value;
}

function mapOccupancy(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper.includes('PRIMARY') || upper === 'OWNER') return 'Primary Residence';
  if (upper.includes('INVESTMENT') || upper === 'INV') return 'Investment Property';
  if (upper.includes('SECOND')) return 'Second Home';
  return value;
}

function mapPrType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === 'P') return 'Purchase';
  if (upper === 'R') return 'Refinance';
  if (upper === 'HELOC') return 'HELOC';
  return value;
}

function mapCondoStatus(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === 'APPROVED' || upper === 'FULL') return 'Approved';
  if (upper === 'LIMITED') return 'Limited Review';
  if (upper === 'NWC') return 'NWC';
  if (upper === 'N/A') return 'N/A';
  if (upper === 'TRANSFER') return 'Transfer';
  if (upper === 'RECEIVED') return 'Received';
  return value;
}

function mapEscrows(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase();
  if (upper === 'COMPLETE' || upper === 'YES') return 'Waived';
  if (upper === 'REQUESTED' || upper === 'N/A' || upper === 'NO') return 'Escrowed';
  if (upper.includes('BOTH')) return 'Waived';
  return null;
}

function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  // Remove backslashes from escaped emails
  return value.replace(/\\/g, '').toLowerCase().trim();
}

function cleanPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  // Keep only digits
  const digits = String(value).replace(/[^0-9]/g, '');
  // Remove leading 1 if it's an 11-digit US number
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits || null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mode, data } = await req.json();
    console.log(`Import past clients - Mode: ${mode}, Records: ${data?.length || 0}`);

    // Fetch existing lenders for matching
    const { data: existingLenders } = await supabase
      .from('lenders')
      .select('id, lender_name');

    // Fetch existing agents for matching
    const { data: existingAgents } = await supabase
      .from('buyer_agents')
      .select('id, first_name, last_name, email');

    // Lender name mapping
    const lenderNameMap: Record<string, string> = {
      'UWM': 'UWM',
      'REMN': 'REMN',
      'A&D': 'A&D MORTGAGE LLC',
      'PENNYMAC': 'PENNYMAC',
      'PRMG': 'PRMG',
      'DEEPHAVEN': 'DEEPHAVEN',
      'FUND LOANS': 'FUND LOANS',
      'THE LOAN STORE': 'THE LOAN STORE',
      'NEWREZ': 'Newrez',
      'REMINGTON': 'Remington',
      'UCB': 'UCB',
      'POWERTPO': 'PowerTPO',
      'SIERRA PACIFIC': 'SIERRA PACIFIC',
      'JMAC': 'JMAC',
      'CHAMPIONS FUNDING': 'Champions Funding',
      'PENNYMAC': 'PennyMac',
    };

    function getLenderId(lenderName: string | null): string | null {
      if (!lenderName) return null;
      const upperName = lenderName.toUpperCase();
      
      // Try direct match first
      const mappedName = lenderNameMap[upperName] || lenderName;
      
      const found = existingLenders?.find(l => 
        l.lender_name?.toUpperCase() === mappedName.toUpperCase() ||
        l.lender_name?.toUpperCase().includes(upperName) ||
        upperName.includes(l.lender_name?.toUpperCase() || '')
      );
      
      return found?.id || null;
    }

    async function getOrCreateAgent(firstName: string | null, lastName: string | null, email: string | null, phone: string | null): Promise<string | null> {
      if (!firstName || firstName.toUpperCase() === 'REFI' || firstName.toUpperCase() === 'MY TEAM' || firstName.toUpperCase() === 'NO AGENT') {
        return null;
      }

      // Try to find existing agent
      const cleanedEmail = cleanEmail(email);
      let found = existingAgents?.find(a => 
        (cleanedEmail && a.email?.toLowerCase() === cleanedEmail) ||
        (a.first_name?.toLowerCase() === firstName.toLowerCase() && a.last_name?.toLowerCase() === lastName?.toLowerCase())
      );

      if (found) return found.id;

      // Create new agent
      const { data: newAgent, error } = await supabase
        .from('buyer_agents')
        .insert({
          first_name: firstName,
          last_name: lastName || '',
          email: cleanedEmail,
          phone: cleanPhone(phone),
          brokerage: 'Unknown',
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating agent:', error);
        return null;
      }

      // Add to cache
      existingAgents?.push({ id: newAgent.id, first_name: firstName, last_name: lastName, email: cleanedEmail });
      return newAgent.id;
    }

    if (mode === 'PREVIEW') {
      return new Response(JSON.stringify({
        mode: 'PREVIEW',
        recordCount: data.length,
        lendersFound: existingLenders?.length || 0,
        agentsFound: existingAgents?.length || 0,
        message: 'Ready to import. Call with mode=APPLY to execute.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // APPLY mode - do the import
    const results = { imported: 0, errors: [] as string[] };

    for (const row of data) {
      try {
        // Get or create buyer agent
        const buyerAgentId = await getOrCreateAgent(
          row['BUYERS AGENT FN'] || row['BA FN'],
          row['BUYERS AGENT LN'] || row['BA LN'],
          row["Buyer's Agent Email"] || row['BA EMAIL'],
          row["Buyer's Agent Phone #"] || row['BA PHONE']
        );

        // Get or create listing agent
        const listingAgentId = await getOrCreateAgent(
          row['LISTING AGENT FN'] || row['LA FN'],
          row['LISTING AGENT LN'] || row['LA LN'],
          row['Listing Agent Email'] || row['LA EMAIL'],
          row["Seller's Agent Phone"] || row['LA PHONE']
        );

        // Get lender ID
        const lenderId = getLenderId(row['LENDER']);

        // Build lead record
        const lead = {
          first_name: row['Borrower FN'] || row['Name']?.split(' ')[0] || 'Unknown',
          last_name: row['Borrower LN'] || row['Name']?.split(' ').slice(1).join(' ') || '',
          email: cleanEmail(row['Borrower Email']),
          phone: cleanPhone(row['Borrower Phone']),
          dob: parseDate(row['BORROWER DOB']),
          
          // Loan info
          arrive_loan_number: row['ARIVE LOAN #'] || null,
          mb_loan_number: row['LENDER LOAN #'] || null,
          approved_lender_id: lenderId,
          loan_amount: parseDecimal(row['LOAN AMT']),
          sales_price: parseDecimal(row['SALES PRICE']),
          appraisal_value: row['APPRAISED VALUE'] ? String(parseDecimal(row['APPRAISED VALUE'])) : null,
          interest_rate: parseDecimal(row['RATE']),
          term: normalizeTerm(row['TERM']),
          ltv: parseDecimal(row['LTV']),
          
          // Property
          subject_address_1: row['SUBJECT PROP ADDRESS'] || null,
          subject_address_2: row['ADDRESS 2'] || null,
          subject_city: row['CITY'] || null,
          subject_state: row['STATE'] || null,
          subject_zip: row['ZIP CODE'] || null,
          condo_name: row['CONDO NAME'] || null,
          property_type: mapPropertyType(row['PROP TYPE']),
          occupancy: mapOccupancy(row['OCC']),
          pr_type: mapPrType(row['P/R']),
          condo_status: mapCondoStatus(row['CONDO APPROVAL STATUS']),
          escrows: mapEscrows(row['ESCROW WAIVED?']),
          
          // Dates
          close_date: parseDate(row['CLOSE DATE']),
          lead_created_at: parseDate(row['LEAD ON']),
          sub_date: parseDate(row['SUB']),
          awc_date: parseDate(row['AWC']),
          ctc_date: parseDate(row['CTC']),
          
          // Title
          title_company: row['TITLE NAME'] || null,
          title_email: cleanEmail(row['TITLE EMAIL']),
          title_phone: cleanPhone(row['TITLE PHONE']),
          
          // Agents
          buyer_agent_id: buyerAgentId,
          listing_agent_id: listingAgentId,
          
          // Pipeline
          pipeline_stage: 'Past Clients',
          pipeline_section: 'Closed',
          loan_status: 'CLOSED',
          
          // Co-borrower stored in notes or custom field
          co_borrower_name: row['Co-Borrower Full Name'] || null,
          co_borrower_email: cleanEmail(row['Co-Borrower Email']),
        };

        const { error } = await supabase.from('leads').insert(lead);

        if (error) {
          console.error('Error inserting lead:', error, lead);
          results.errors.push(`${lead.first_name} ${lead.last_name}: ${error.message}`);
        } else {
          results.imported++;
        }
      } catch (e) {
        console.error('Error processing row:', e);
        results.errors.push(`Row error: ${e.message}`);
      }
    }

    console.log(`Import complete: ${results.imported} imported, ${results.errors.length} errors`);

    return new Response(JSON.stringify({
      mode: 'APPLY',
      imported: results.imported,
      errors: results.errors,
      message: `Successfully imported ${results.imported} past clients`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
