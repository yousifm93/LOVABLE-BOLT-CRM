import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Required constants
const DEFAULT_ACCOUNT_ID = '05bad2ba-d44c-4af3-b3ff-2478f10a6cac';
const DEFAULT_CREATED_BY = 'b06a12ea-00b9-4725-b368-e8a416d4028d';
const PAST_CLIENTS_STAGE_ID = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd';

// Direct lender name to UUID mapping
const LENDER_ID_MAP: Record<string, string> = {
  'A&D': '42d1d051-3d59-4f9a-af15-003a465fe68e',
  'UWM': 'de9cb248-08fe-4554-a746-cb51a89c310b',
  'PENNYMAC': '8ce48b0c-5c4e-43f9-8ac1-5c7f962c05ab',
  'PRMG': 'fb605edb-285a-4b6e-839f-0bd13a44b23e',
  'DEEPHAVEN': 'ca7ce886-de8f-4a0b-9735-92ac95e02d9b',
  'THE LOAN STORE': '9ecc2c31-4439-43e0-86ba-6b2280949ff7',
  'FUND LOANS': '9d4a54b2-0023-4784-86c5-f9589c1ed6b7',
  'CHAMPIONS FUNDING': 'd3891cc2-7fd5-48cc-9bc1-f4564fbfa74f',
  'REMN': 'b95b0ddd-0dc3-4543-a09f-a6c72ed0464b',
  'NEWREZ': 'b95b0ddd-0dc3-4543-a09f-a6c72ed0464b',
  'REMINGTON': 'b95b0ddd-0dc3-4543-a09f-a6c72ed0464b',
  'JMAC': '2f73be4a-30aa-4126-aa2b-d8e9e0767872',
  'SIERRA PACIFIC': '64db6af8-f0a5-4876-b7a7-8d3fa6f3c8e2',
  'POWERTPO': '5df90f36-e9fb-4e8b-97e8-44e544bcfd5c',
  'UCB': 'c2e5f8b1-0a3d-4e6f-9c2b-7d8a9e0f1b2c',
};

// Helper functions
function parseDate(value: string | null | undefined): string | null {
  if (!value || value === '' || value === 'null' || value === 'undefined') return null;
  
  // Handle ISO dates (2025-09-17T00:00:00)
  if (value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return value.split('T')[0];
  }
  
  // Handle MM/DD/YYYY format
  const mdyMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Handle Excel date strings like "12/25/91 0:00"
  const dateMatch = value.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (dateMatch) {
    const [, month, day, year] = dateMatch;
    const fullYear = year.length === 2 ? (parseInt(year) > 50 ? `19${year}` : `20${year}`) : year;
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
  return null; // Return null for unrecognized values
}

function mapOccupancy(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper.includes('PRIMARY') || upper === 'OWNER' || upper === 'P' || upper === 'PRI') return 'Primary Residence';
  if (upper.includes('INVESTMENT') || upper === 'INV' || upper === 'I') return 'Investment Property';
  if (upper.includes('SECOND') || upper === 'SH' || upper === 'S') return 'Second Home';
  return null; // Return null for unrecognized values
}

function mapPrType(value: string | null): string | null {
  if (!value) return null;
  const upper = value.toUpperCase().trim();
  if (upper === 'P' || upper === 'PURCHASE') return 'P';
  if (upper === 'R' || upper === 'REFINANCE' || upper === 'REFI') return 'R';
  if (upper === 'HELOC') return 'HELOC';
  if (upper === 'CO') return 'CO';
  return null; // Return null for unrecognized values
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
  return null; // Return null for unrecognized values
}

function cleanEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.replace(/\\/g, '').toLowerCase().trim() || null;
}

function cleanPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = String(value).replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  return digits || null;
}

function getLenderId(lenderName: string | null): string | null {
  if (!lenderName) return null;
  const upperName = lenderName.toUpperCase().trim();
  
  // Direct match
  if (LENDER_ID_MAP[upperName]) {
    return LENDER_ID_MAP[upperName];
  }
  
  // Partial match
  for (const [key, id] of Object.entries(LENDER_ID_MAP)) {
    if (upperName.includes(key) || key.includes(upperName)) {
      return id;
    }
  }
  
  return null;
}

function isValidRow(row: Record<string, any>): boolean {
  const firstName = row.first_name || row['first_name'] || row['BORROWER FN'] || row['Borrower FN'];
  
  // Skip if no first name
  if (!firstName || firstName.trim() === '') return false;
  
  // Skip header rows
  const upper = firstName.toUpperCase().trim();
  if (upper === 'BORROWER FN' || upper === 'BORROWER FULL NAME' || upper === 'FIRST_NAME' || upper === 'NAME') {
    return false;
  }
  
  return true;
}

function isUUID(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
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

    // Parse tab-separated data if provided as string
    const parseTabData = (tabText: string): Record<string, any>[] => {
      const lines = tabText.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return [];
      
      const headers = lines[0].split('\t');
      const out: Record<string, any>[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split('\t');
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          const val = values[idx]?.trim();
          row[h.trim()] = (!val || val === '' || val === 'null') ? null : val;
        });
        out.push(row);
      }
      
      return out;
    };

    // Accept data in multiple formats
    let data: Record<string, any>[] = [];
    if (Array.isArray(body?.data)) {
      data = body.data;
    } else if (typeof body?.tab_data === 'string') {
      data = parseTabData(body.tab_data);
    } else if (typeof body?.table_text === 'string') {
      data = parseTabData(body.table_text);
    }

    // Detect format: database format has 'first_name', Excel format has 'BORROWER FN'
    const isDatabaseFormat = data.length > 0 && ('first_name' in data[0] || 'id' in data[0]);
    
    console.log(`Import past clients - Mode: ${mode}, Records: ${data.length}, Format: ${isDatabaseFormat ? 'database' : 'excel'}`);
    if (data.length > 0) {
      console.log('Sample columns:', Object.keys(data[0]).slice(0, 15).join(', '));
    }

    if (mode === 'PREVIEW') {
      const validCount = data.filter(isValidRow).length;
      return new Response(JSON.stringify({
        mode: 'PREVIEW',
        totalRecords: data.length,
        validRecords: validCount,
        format: isDatabaseFormat ? 'database' : 'excel',
        sampleColumns: data.length > 0 ? Object.keys(data[0]).slice(0, 25) : [],
        message: `Ready to import ${validCount} valid records. Call with mode=APPLY to execute.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // APPLY mode - do the import
    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    // Soft-delete existing Past Clients
    const deletedAt = new Date().toISOString();
    const { error: deleteErr } = await supabase
      .from('leads')
      .update({ deleted_at: deletedAt, deleted_by: null })
      .eq('pipeline_stage_id', PAST_CLIENTS_STAGE_ID)
      .is('deleted_at', null);

    if (deleteErr) {
      console.error('Failed to clear existing Past Clients:', deleteErr);
    }

    for (const row of data) {
      try {
        // Skip invalid rows
        if (!isValidRow(row)) {
          results.skipped++;
          continue;
        }

        // Handle database format directly
        if (isDatabaseFormat) {
          // Extract lender name and map to ID
          let lenderId: string | null = null;
          
          // If approved_lender_id is already a UUID, try to use it
          if (isUUID(row.approved_lender_id)) {
            lenderId = row.approved_lender_id;
          }
          
          // If we have lender_id as UUID, use it
          if (!lenderId && isUUID(row.lender_id)) {
            lenderId = row.lender_id;
          }
          
          // Extract lender name from various possible fields in notes or other places
          const lenderNameFromRow = row.lender || row.lender_name;
          if (!lenderId && lenderNameFromRow) {
            lenderId = getLenderId(lenderNameFromRow);
          }

          // Build co-borrower notes if present
          const coBorrowerNotes: string[] = [];
          if (row.co_borrower_first_name || row.co_borrower_last_name) {
            const coName = [row.co_borrower_first_name, row.co_borrower_last_name].filter(Boolean).join(' ');
            const coEmail = row.co_borrower_email;
            coBorrowerNotes.push(`Co-Borrower: ${coName}${coEmail ? ` (${coEmail})` : ''}`);
          }
          if (row.lender_loan_number) {
            coBorrowerNotes.push(`Lender Loan #: ${row.lender_loan_number}`);
          }
          
          // Combine existing notes with co-borrower info
          const existingNotes = row.notes || '';
          const combinedNotes = [existingNotes, ...coBorrowerNotes].filter(Boolean).join('\n') || null;

          const lead: Record<string, any> = {
            // Required fields
            account_id: DEFAULT_ACCOUNT_ID,
            created_by: DEFAULT_CREATED_BY,
            pipeline_stage_id: PAST_CLIENTS_STAGE_ID,
            
            // Basic info
            first_name: row.first_name,
            last_name: row.last_name || '',
            email: cleanEmail(row.email),
            phone: cleanPhone(row.phone),
            dob: parseDate(row.dob),
            
            // Loan info
            mb_loan_number: row.mb_loan_number || row.arrive_loan_number,
            approved_lender_id: lenderId,
            loan_amount: parseDecimal(row.loan_amount),
            sales_price: parseDecimal(row.sales_price),
            appraisal_value: row.appraisal_value ? String(parseDecimal(row.appraisal_value)) : null,
            interest_rate: parseDecimal(row.interest_rate),
            term: normalizeTerm(row.term),
            down_pmt: parseDecimal(row.down_pmt),
            fico_score: parseDecimal(row.fico_score),
            
            // Property info
            subject_address_1: row.subject_address_1,
            subject_address_2: row.subject_address_2,
            subject_city: row.subject_city,
            subject_state: row.subject_state,
            subject_zip: row.subject_zip,
            condo_name: row.condo_name,
            property_type: mapPropertyType(row.property_type),
            occupancy: mapOccupancy(row.occupancy),
            pr_type: mapPrType(row.pr_type),
            condo_status: mapCondoStatus(row.condo_status),
            
            // Dates
            close_date: parseDate(row.close_date),
            lead_on_date: parseDate(row.lead_on_date) || new Date().toISOString().split('T')[0],
            
            // Agents - use existing UUIDs if valid
            buyer_agent_id: isUUID(row.buyer_agent_id) ? row.buyer_agent_id : null,
            listing_agent_id: isUUID(row.listing_agent_id) ? row.listing_agent_id : null,
            
            // Status
            status: row.status || 'CLOSED',
            pipeline_section: 'Closed',
            loan_status: 'Closed',
            is_closed: true,
            closed_at: parseDate(row.close_date) ? new Date(`${parseDate(row.close_date)}T00:00:00.000Z`).toISOString() : null,
            
            // Source - don't set source as it's an enum
            referral_source: row.referral_source || 'Past Client',
            
            // Notes
            notes: combinedNotes,
          };

          // Remove undefined/null keys
          Object.keys(lead).forEach(key => {
            if (lead[key] === undefined || lead[key] === null || lead[key] === '') {
              delete lead[key];
            }
          });

          // Ensure required fields are present
          lead.account_id = DEFAULT_ACCOUNT_ID;
          lead.created_by = DEFAULT_CREATED_BY;
          lead.pipeline_stage_id = PAST_CLIENTS_STAGE_ID;
          lead.first_name = lead.first_name || 'Unknown';

          const { error } = await supabase.from('leads').insert(lead);

          if (error) {
            console.error('Error inserting lead:', error, { name: `${lead.first_name} ${lead.last_name}` });
            results.errors.push(`${lead.first_name} ${lead.last_name}: ${error.message}`);
          } else {
            results.imported++;
          }
        } else {
          // Handle Excel format (original logic) - simplified
          const borrowerFirst = row['Borrower FN'] || row['BORROWER FN'] || row['First Name'] || 'Unknown';
          const borrowerLast = row['Borrower LN'] || row['BORROWER LN'] || row['Last Name'] || '';
          
          const lenderId = getLenderId(row['LENDER'] || row['Lender Name']);
          const closeDate = parseDate(row['CLOSE DATE'] || row['Close Date']);
          const leadOnDate = parseDate(row['LEAD ON'] || row['Lead Date']);

          const lead: Record<string, any> = {
            account_id: DEFAULT_ACCOUNT_ID,
            created_by: DEFAULT_CREATED_BY,
            pipeline_stage_id: PAST_CLIENTS_STAGE_ID,
            
            first_name: borrowerFirst,
            last_name: borrowerLast,
            email: cleanEmail(row['Borrower Email'] || row['Email']),
            phone: cleanPhone(row['Borrower Phone'] || row['Phone']),
            
            mb_loan_number: row['ARIVE LOAN #'] || row['MB LOAN #'],
            approved_lender_id: lenderId,
            loan_amount: parseDecimal(row['LOAN AMT'] || row['Loan Amount']),
            sales_price: parseDecimal(row['SALES PRICE'] || row['Sales Price']),
            
            subject_address_1: row['SUBJECT PROP ADDRESS'] || row['Property Address'],
            subject_city: row['CITY'] || row['City'],
            subject_state: row['STATE'] || row['State'],
            subject_zip: row['ZIP CODE'] || row['Zip'],
            
            property_type: mapPropertyType(row['PROP TYPE'] || row['Property Type']),
            occupancy: mapOccupancy(row['OCC'] || row['Occupancy']),
            
            close_date: closeDate,
            lead_on_date: leadOnDate || new Date().toISOString().split('T')[0],
            
            status: 'CLOSED',
            pipeline_section: 'Closed',
            loan_status: 'Closed',
            is_closed: true,
            closed_at: closeDate ? new Date(`${closeDate}T00:00:00.000Z`).toISOString() : null,
            
            referral_source: 'Past Client',
            source: 'Past Client',
          };

          Object.keys(lead).forEach(key => {
            if (lead[key] === undefined || lead[key] === null || lead[key] === '') {
              delete lead[key];
            }
          });

          lead.account_id = DEFAULT_ACCOUNT_ID;
          lead.created_by = DEFAULT_CREATED_BY;
          lead.pipeline_stage_id = PAST_CLIENTS_STAGE_ID;
          lead.first_name = lead.first_name || 'Unknown';

          const { error } = await supabase.from('leads').insert(lead);

          if (error) {
            console.error('Error inserting lead:', error, { name: `${lead.first_name} ${lead.last_name}` });
            results.errors.push(`${lead.first_name} ${lead.last_name}: ${error.message}`);
          } else {
            results.imported++;
          }
        }
      } catch (e: any) {
        console.error('Error processing row:', e);
        results.errors.push(`Row error: ${e.message}`);
      }
    }
    
    console.log(`Import complete: ${results.imported} imported, ${results.skipped} skipped, ${results.errors.length} errors`);

    return new Response(JSON.stringify({
      mode: 'APPLY',
      imported: results.imported,
      skipped: results.skipped,
      errors: results.errors.slice(0, 10), // Only return first 10 errors
      message: `Successfully imported ${results.imported} past clients (${results.skipped} skipped)`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
