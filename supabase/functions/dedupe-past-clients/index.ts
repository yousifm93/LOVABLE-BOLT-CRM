import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PAST_CLIENTS_STAGE_ID = 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd';

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  mb_loan_number: string | null;
  loan_amount: number | null;
  sales_price: number | null;
  close_date: string | null;
  interest_rate: number | null;
  approved_lender_id: string | null;
  subject_address_1: string | null;
  created_at: string;
  [key: string]: any;
}

// Count non-null important fields to determine "best" record
function countFilledFields(lead: Lead): number {
  const importantFields = [
    'loan_amount', 'sales_price', 'close_date', 'interest_rate', 
    'approved_lender_id', 'subject_address_1', 'email', 'phone'
  ];
  return importantFields.filter(f => lead[f] !== null && lead[f] !== undefined && lead[f] !== '').length;
}

// Choose the canonical (best) record from a group of duplicates
function chooseCanonical(leads: Lead[]): Lead {
  return leads.sort((a, b) => {
    // Prefer record with loan_amount
    const aHasAmount = a.loan_amount !== null && a.loan_amount !== undefined;
    const bHasAmount = b.loan_amount !== null && b.loan_amount !== undefined;
    if (aHasAmount && !bHasAmount) return -1;
    if (!aHasAmount && bHasAmount) return 1;
    
    // Prefer record with more filled fields
    const aFilled = countFilledFields(a);
    const bFilled = countFilledFields(b);
    if (aFilled !== bFilled) return bFilled - aFilled;
    
    // Prefer most recent created_at
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  })[0];
}

// Merge fields from duplicate into canonical (only if canonical is missing the field)
function mergeFields(canonical: Lead, duplicate: Lead): Record<string, any> {
  const updates: Record<string, any> = {};
  const fieldsToCopy = [
    'loan_amount', 'sales_price', 'interest_rate', 'close_date',
    'approved_lender_id', 'subject_address_1', 'subject_address_2',
    'subject_city', 'subject_state', 'subject_zip', 'email', 'phone',
    'buyer_agent_id', 'listing_agent_id', 'notes'
  ];
  
  for (const field of fieldsToCopy) {
    const canonicalVal = canonical[field];
    const dupVal = duplicate[field];
    
    // If canonical is missing but duplicate has it, copy it
    if ((canonicalVal === null || canonicalVal === undefined || canonicalVal === '') &&
        dupVal !== null && dupVal !== undefined && dupVal !== '') {
      updates[field] = dupVal;
    }
  }
  
  return updates;
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
    const year = body?.year ?? 2024;
    const dryRun = body?.dryRun ?? false;

    console.log(`Dedupe past clients - Year: ${year}, Dry run: ${dryRun}`);

    // Fetch all Past Client leads for the specified year where mb_loan_number is not null
    const startOfYear = `${year}-01-01`;
    const endOfYear = `${year}-12-31`;
    
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .eq('pipeline_stage_id', PAST_CLIENTS_STAGE_ID)
      .is('deleted_at', null)
      .not('mb_loan_number', 'is', null)
      .gte('close_date', startOfYear)
      .lte('close_date', endOfYear)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${leads?.length || 0} Past Client leads for ${year}`);

    if (!leads || leads.length === 0) {
      return new Response(JSON.stringify({
        message: `No Past Client leads found for ${year}`,
        grouped: 0,
        dedupedGroups: 0,
        recordsSoftDeleted: 0,
        recordsMerged: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Group by mb_loan_number
    const groups: Record<string, Lead[]> = {};
    for (const lead of leads) {
      const key = lead.mb_loan_number?.trim();
      if (!key) continue;
      if (!groups[key]) groups[key] = [];
      groups[key].push(lead as Lead);
    }

    const results = {
      totalLeads: leads.length,
      uniqueLoanNumbers: Object.keys(groups).length,
      duplicateGroups: 0,
      recordsSoftDeleted: 0,
      recordsMerged: 0,
      details: [] as { loanNumber: string; kept: string; deleted: string[]; merged: boolean }[],
    };

    // Process each group with duplicates
    for (const [loanNumber, groupLeads] of Object.entries(groups)) {
      if (groupLeads.length <= 1) continue;
      
      results.duplicateGroups++;
      
      // Choose canonical record
      const canonical = chooseCanonical(groupLeads);
      const duplicates = groupLeads.filter(l => l.id !== canonical.id);
      
      console.log(`Processing duplicate group: ${loanNumber} (${groupLeads.length} records, keeping ${canonical.id})`);
      
      // Merge fields from duplicates into canonical
      let mergedAnyFields = false;
      for (const dup of duplicates) {
        const mergeUpdates = mergeFields(canonical, dup);
        if (Object.keys(mergeUpdates).length > 0) {
          mergedAnyFields = true;
          if (!dryRun) {
            const { error: updateError } = await supabase
              .from('leads')
              .update(mergeUpdates)
              .eq('id', canonical.id);
            
            if (updateError) {
              console.error(`Error merging into ${canonical.id}:`, updateError);
            } else {
              console.log(`Merged ${Object.keys(mergeUpdates).length} fields into ${canonical.id}:`, Object.keys(mergeUpdates));
              results.recordsMerged++;
            }
          } else {
            console.log(`[DRY RUN] Would merge ${Object.keys(mergeUpdates).length} fields into ${canonical.id}:`, Object.keys(mergeUpdates));
            results.recordsMerged++;
          }
        }
      }
      
      // Soft-delete duplicates
      const duplicateIds = duplicates.map(d => d.id);
      if (!dryRun) {
        const { error: deleteError } = await supabase
          .from('leads')
          .update({ deleted_at: new Date().toISOString() })
          .in('id', duplicateIds);
        
        if (deleteError) {
          console.error(`Error soft-deleting duplicates for ${loanNumber}:`, deleteError);
        } else {
          results.recordsSoftDeleted += duplicateIds.length;
          console.log(`Soft-deleted ${duplicateIds.length} duplicates for ${loanNumber}`);
        }
      } else {
        console.log(`[DRY RUN] Would soft-delete ${duplicateIds.length} duplicates for ${loanNumber}`);
        results.recordsSoftDeleted += duplicateIds.length;
      }
      
      results.details.push({
        loanNumber,
        kept: canonical.id,
        deleted: duplicateIds,
        merged: mergedAnyFields,
      });
    }

    console.log(`Dedupe complete: ${results.duplicateGroups} duplicate groups, ${results.recordsSoftDeleted} deleted, ${results.recordsMerged} merged`);

    return new Response(JSON.stringify({
      dryRun,
      year,
      ...results,
      message: dryRun 
        ? `[DRY RUN] Would dedupe ${results.duplicateGroups} groups, soft-delete ${results.recordsSoftDeleted} duplicates, merge ${results.recordsMerged} records`
        : `Deduped ${results.duplicateGroups} groups, soft-deleted ${results.recordsSoftDeleted} duplicates, merged ${results.recordsMerged} records`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Dedupe error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
