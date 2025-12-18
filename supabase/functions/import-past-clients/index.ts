import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper functions
function parseDate(value: string | null | undefined): string | null {
  if (!value || value === '' || value === 'null' || value === 'undefined') return null;
  
  // Handle ISO dates
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value.split('T')[0];
  }
  
  // Handle MM/DD/YYYY format
  const mdyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle Excel date strings like "12/15/2023"
  const dateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

function parseDecimal(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parsePercentage(value: any): number | null {
  if (value === null || value === undefined || value === '' || value === 'null') return null;
  let cleaned = String(value).replace(/[%\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeTerm(value: any): number | null {
  const num = parseDecimal(value);
  if (num === null) return null;
  // If term is like 30 or 15, convert to months (assume years if <= 50)
  if (num <= 50) return num * 12;
  return num;
}

function mapPropertyType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper.includes('CONDO') || upper === 'CONDOMINIUM') return 'Condo';
  if (upper === 'SFR' || upper.includes('SINGLE')) return 'Single Family';
  if (upper.includes('TOWN')) return 'Townhouse';
  if (upper.includes('MULTI')) return 'Multi-Family';
  if (upper.includes('2-4') || upper.includes('2 - 4')) return '2-4 Unit';
  if (upper.includes('PUD')) return 'PUD';
  return value;
}

function mapOccupancy(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper.includes('PRIMARY') || upper === 'OWNER' || upper === 'P' || upper === 'PRI') return 'Primary Residence';
  if (upper.includes('INVESTMENT') || upper === 'INV' || upper === 'I') return 'Investment Property';
  if (upper.includes('SECOND') || upper === 'SH' || upper === 'S') return 'Second Home';
  return value;
}

function mapPrType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper === 'P' || upper === 'PURCHASE') return 'P';
  if (upper === 'R' || upper === 'REFINANCE' || upper === 'REFI') return 'R';
  if (upper === 'HELOC') return 'HELOC';
  if (upper === 'CO') return 'CO';
  return value;
}

function mapCondoStatus(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper === 'APPROVED' || upper === 'FULL' || upper === 'APP') return 'Approved';
  if (upper === 'LIMITED' || upper === 'LTD') return 'Limited Review';
  if (upper === 'NWC') return 'NWC';
  if (upper === 'N/A' || upper === 'NA') return 'N/A';
  if (upper === 'TRANSFER') return 'Transfer';
  if (upper === 'RECEIVED' || upper === 'REC') return 'Docs Received';
  if (upper === 'ORDERED' || upper === 'ORD') return 'Ordered';
  return value;
}

function mapEscrows(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper === 'COMPLETE' || upper === 'YES' || upper === 'Y' || upper === 'WAIVED') return 'Waived';
  if (upper === 'REQUESTED' || upper === 'N/A' || upper === 'NO' || upper === 'N' || upper === 'ESCROWED') return 'Escrowed';
  if (upper.includes('BOTH')) return 'Waived';
  return null;
}

function mapLoanProgram(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper.includes('CONV') || upper === 'C') return 'Conventional';
  if (upper.includes('FHA') || upper === 'F') return 'FHA';
  if (upper.includes('VA') || upper === 'V') return 'VA';
  if (upper.includes('USDA')) return 'USDA';
  if (upper.includes('NON-QM') || upper.includes('NONQM')) return 'Non-QM';
  if (upper.includes('DSCR')) return 'DSCR';
  if (upper.includes('BANK') && upper.includes('STATEMENT')) return 'Bank Statement';
  if (upper.includes('JUMBO')) return 'Jumbo';
  return value;
}

function mapReferralMethod(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper.includes('AGENT') || upper.includes('REALTOR')) return 'Agent Referral';
  if (upper.includes('PAST') && upper.includes('CLIENT')) return 'Past Client';
  if (upper.includes('ZILLOW')) return 'Zillow';
  if (upper.includes('SOCIAL')) return 'Social Media';
  if (upper.includes('WEB')) return 'Website';
  if (upper.includes('FRIEND') || upper.includes('FAMILY')) return 'Friend/Family';
  return value;
}

function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  // Remove backslashes from escaped emails and clean
  return value.replace(/\\/g, '').toLowerCase().trim() || null;
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

// Column name variations mapping
function getColumnValue(row: Record<string, string | null>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key];
    }
  }
  return null;
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

    const body = await req.json().catch(() => ({}));
    const mode = body?.mode ?? 'PREVIEW';

    const parseTableText = (tableText: string): Record<string, string | null>[] => {
      const lines = tableText
        .split(/\r?\n/)
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith('|'));

      if (lines.length < 2) return [];

      const parseRow = (line: string): string[] =>
        line
          .split('|')
          .slice(1, -1)
          .map((v) => v.trim());

      const headers = parseRow(lines[0]);
      const out: Record<string, string | null>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseRow(lines[i]);
        const nameIdx = headers.indexOf('Name');
        if (nameIdx >= 0 && (!values[nameIdx] || values[nameIdx].toLowerCase() === 'name')) continue;

        const row: Record<string, string | null> = {};
        headers.forEach((h, idx) => {
          row[h] = values[idx] === undefined || values[idx] === '' ? null : values[idx];
        });
        out.push(row);
      }

      return out;
    };

    const data: Record<string, string | null>[] = Array.isArray(body?.data)
      ? body.data
      : typeof body?.table_text === 'string'
        ? parseTableText(body.table_text)
        : [];

    console.log(`Import past clients - Mode: ${mode}, Records: ${data.length}`);
    if (data.length > 0) {
      console.log('Sample columns:', Object.keys(data[0]).slice(0, 15).join(', '));
    }

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
      'PENNYMAC': 'PennyMac',
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
      'PLANET HOME': 'Planet Home Lending',
      'FLAGSTAR': 'Flagstar',
      'ROCKET': 'Rocket Mortgage',
      'GUARANTEED RATE': 'Guaranteed Rate',
    };

    function getLenderId(lenderName: string | null): string | null {
      if (!lenderName) return null;
      const upperName = lenderName.toUpperCase().trim();
      
      // Try direct match first
      const mappedName = lenderNameMap[upperName] || lenderName;
      
      const found = existingLenders?.find(l => 
        l.lender_name?.toUpperCase() === mappedName.toUpperCase() ||
        l.lender_name?.toUpperCase().includes(upperName) ||
        upperName.includes(l.lender_name?.toUpperCase() || '')
      );
      
      return found?.id || null;
    }

    async function getOrCreateAgent(firstName: string | null, lastName: string | null, email: string | null, phone: string | null, brokerage: string | null = null): Promise<string | null> {
      if (!firstName || firstName.toUpperCase() === 'REFI' || firstName.toUpperCase() === 'MY TEAM' || firstName.toUpperCase() === 'NO AGENT' || firstName.toUpperCase() === 'N/A') {
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
          brokerage: brokerage || 'Unknown',
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
        sampleColumns: data.length > 0 ? Object.keys(data[0]).slice(0, 20) : [],
        message: 'Ready to import. Call with mode=APPLY to execute.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // APPLY mode - do the import
    const results = { imported: 0, errors: [] as string[] };

    // Resolve Past Clients pipeline stage id
    const fallbackPastClientsStageId = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd';
    let pastClientsStageId = fallbackPastClientsStageId;
    try {
      const { data: stageRow, error: stageErr } = await supabase
        .from('pipeline_stages')
        .select('id, name')
        .ilike('name', '%past%client%')
        .limit(1)
        .maybeSingle();
      if (!stageErr && stageRow?.id) pastClientsStageId = stageRow.id;
    } catch (_e) {
      // ignore
    }

    // Soft-delete existing Past Clients so the imported list becomes the only Past Clients
    const deletedAt = new Date().toISOString();
    const { error: deleteErr } = await supabase
      .from('leads')
      .update({ deleted_at: deletedAt, deleted_by: null })
      .eq('pipeline_stage_id', pastClientsStageId)
      .is('deleted_at', null);

    if (deleteErr) {
      console.error('Failed to clear existing Past Clients:', deleteErr);
    }

    for (const row of data) {
      try {
        // Get borrower info with column variations
        const borrowerFirst = getColumnValue(row, 'Borrower FN', 'First Name', 'BORROWER FN', 'FN') || 
                            row['Name']?.split(' ')[0] || 'Unknown';
        const borrowerLast = getColumnValue(row, 'Borrower LN', 'Last Name', 'BORROWER LN', 'LN') || 
                           row['Name']?.split(' ').slice(1).join(' ') || '';

        // Get or create buyer agent
        const buyerAgentId = await getOrCreateAgent(
          getColumnValue(row, 'BUYERS AGENT FN', 'BA FN', 'BUYERS AGENT', 'Buyer Agent FN'),
          getColumnValue(row, 'BUYERS AGENT LN', 'BA LN', 'Buyer Agent LN'),
          getColumnValue(row, "Buyer's Agent Email", 'BA EMAIL', 'Buyer Agent Email'),
          getColumnValue(row, "Buyer's Agent Phone #", 'BA PHONE', 'Buyer Agent Phone'),
          getColumnValue(row, 'BUYERS AGENT BROKERAGE', 'BA BROKERAGE')
        );

        // Get or create listing agent
        const listingAgentId = await getOrCreateAgent(
          getColumnValue(row, 'LISTING AGENT FN', 'LA FN', 'LISTING AGENT', 'Listing Agent FN'),
          getColumnValue(row, 'LISTING AGENT LN', 'LA LN', 'Listing Agent LN'),
          getColumnValue(row, 'Listing Agent Email', 'LA EMAIL'),
          getColumnValue(row, "Seller's Agent Phone", 'LA PHONE', 'Listing Agent Phone'),
          getColumnValue(row, 'LISTING AGENT BROKERAGE', 'LA BROKERAGE')
        );

        // Get lender ID
        const lenderId = getLenderId(getColumnValue(row, 'LENDER', 'Lender Name', 'LENDER NAME'));

        // Co-borrower info (store in notes since columns don't exist)
        const coFull = getColumnValue(row, 'Co-Borrower Full Name', 'CO-BORROWER', 'CoBorrower') || null;
        const coParts = coFull ? coFull.split(' ').filter(Boolean) : [];
        const coFirst = coParts.length ? coParts[0] : null;
        const coLast = coParts.length > 1 ? coParts.slice(1).join(' ') : null;
        const coEmail = cleanEmail(getColumnValue(row, 'Co-Borrower Email', 'CoBorrower Email'));

        // Dates
        const closeDate = parseDate(getColumnValue(row, 'CLOSE DATE', 'Close Date', 'CLOSING DATE', 'Closing Date'));
        const leadOnDate = parseDate(getColumnValue(row, 'LEAD ON', 'Lead On', 'Lead Date', 'LEAD DATE'));
        const subDate = parseDate(getColumnValue(row, 'SUB', 'SUB DATE', 'Submitted'));
        const awcDate = parseDate(getColumnValue(row, 'AWC', 'AWC DATE'));
        const ctcDate = parseDate(getColumnValue(row, 'CTC', 'CTC DATE'));
        const lastCallDate = parseDate(getColumnValue(row, 'LAST CALL', 'Last Call'));

        // Lender loan number (store in notes since column doesn't exist)
        const lenderLoanNum = getColumnValue(row, 'LENDER LOAN #', 'Lender Loan #');

        // Title company notes
        const titleBits = [
          row['TITLE NAME'] ? `Title: ${row['TITLE NAME']}` : null,
          row['TITLE EMAIL'] ? `Title Email: ${cleanEmail(row['TITLE EMAIL'])}` : null,
          row['TITLE PHONE'] ? `Title Phone: ${cleanPhone(row['TITLE PHONE'])}` : null,
        ].filter(Boolean);

        // Additional notes from dates and fields that don't have columns
        const dateBits = [
          lenderLoanNum ? `Lender Loan #: ${lenderLoanNum}` : null,
          lastCallDate ? `Last Call: ${lastCallDate}` : null,
          (coFirst || coLast) ? `Co-Borrower: ${[coFirst, coLast].filter(Boolean).join(' ')}${coEmail ? ` (${coEmail})` : ''}` : null,
          subDate ? `SUB: ${subDate}` : null,
          awcDate ? `AWC: ${awcDate}` : null,
          ctcDate ? `CTC: ${ctcDate}` : null,
        ].filter(Boolean);

        const allNotes = [...titleBits, ...dateBits].join('\n') || null;

        // Calculate LTV for display only (not stored - calculated field)
        const loanAmt = parseDecimal(getColumnValue(row, 'LOAN AMT', 'Loan Amount', 'LOAN AMOUNT'));
        const salesPrice = parseDecimal(getColumnValue(row, 'SALES PRICE', 'Sales Price', 'Purchase Price'));
        const appraisalValue = parseDecimal(getColumnValue(row, 'APPRAISED VALUE', 'Appraised Value'));

        // Build lead record - only include columns that exist in schema
        const lead: Record<string, any> = {
          first_name: borrowerFirst,
          last_name: borrowerLast,
          email: cleanEmail(getColumnValue(row, 'Borrower Email', 'Email', 'BORROWER EMAIL')),
          phone: cleanPhone(getColumnValue(row, 'Borrower Phone', 'Phone', 'BORROWER PHONE')),
          dob: parseDate(getColumnValue(row, 'BORROWER DOB', 'DOB', 'Date of Birth')),

          mb_loan_number: getColumnValue(row, 'ARIVE LOAN #', 'Arrive Loan #', 'MB LOAN #'),
          approved_lender_id: lenderId,

          loan_amount: loanAmt,
          sales_price: salesPrice,
          appraisal_value: appraisalValue ? String(appraisalValue) : null,
          interest_rate: parseDecimal(getColumnValue(row, 'RATE', 'Interest Rate', 'Rate')),
          term: normalizeTerm(getColumnValue(row, 'TERM', 'Term', 'Loan Term')),

          subject_address_1: getColumnValue(row, 'SUBJECT PROP ADDRESS', 'Property Address', 'Address'),
          subject_address_2: getColumnValue(row, 'ADDRESS 2', 'Unit', 'Apt'),
          subject_city: getColumnValue(row, 'CITY', 'City'),
          subject_state: getColumnValue(row, 'STATE', 'State'),
          subject_zip: getColumnValue(row, 'ZIP CODE', 'Zip', 'ZIP'),
          condo_name: getColumnValue(row, 'CONDO NAME', 'Condo Name'),
          property_type: mapPropertyType(getColumnValue(row, 'PROP TYPE', 'Property Type')),
          occupancy: mapOccupancy(getColumnValue(row, 'OCC', 'Occupancy')),
          pr_type: mapPrType(getColumnValue(row, 'P/R', 'Purpose', 'Loan Purpose')),
          condo_status: mapCondoStatus(getColumnValue(row, 'CONDO APPROVAL STATUS', 'Condo Status')),
          escrows: mapEscrows(getColumnValue(row, 'ESCROW WAIVED?', 'Escrows', 'Escrow')),
          program: mapLoanProgram(getColumnValue(row, 'PROGRAM', 'Loan Program', 'Product')),

          close_date: closeDate,
          lead_on_date: leadOnDate,

          buyer_agent_id: buyerAgentId,
          listing_agent_id: listingAgentId,

          referral_source: mapReferralMethod(getColumnValue(row, 'REFERRAL METHOD', 'Referral', 'Source')),
          lead_strength: getColumnValue(row, 'LEAD STRENGTH', 'Lead Strength'),
          likely_to_apply: getColumnValue(row, 'LIKELY TO APPLY', 'Likely to Apply'),

          pipeline_stage_id: pastClientsStageId,
          pipeline_section: 'Closed',
          loan_status: 'Closed',
          is_closed: true,
          closed_at: closeDate ? new Date(`${closeDate}T00:00:00.000Z`).toISOString() : null,

          notes: allNotes,
        };

        // Remove undefined/null keys to avoid DB errors
        Object.keys(lead).forEach(key => {
          if (lead[key] === undefined) delete lead[key];
        });

        const { error } = await supabase.from('leads').insert(lead);

        if (error) {
          console.error('Error inserting lead:', error, { name: `${lead.first_name} ${lead.last_name}` });
          results.errors.push(`${lead.first_name} ${lead.last_name}: ${error.message}`);
        } else {
          results.imported++;
        }
      } catch (e: any) {
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

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
