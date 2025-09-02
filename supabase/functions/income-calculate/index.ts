import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { borrower_id, agency } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get borrower documents
    const { data: documents } = await supabaseClient
      .from('income_documents')
      .select('*')
      .eq('borrower_id', borrower_id)
      .eq('ocr_status', 'success');

    if (!documents || documents.length === 0) {
      throw new Error('No processed documents found for borrower');
    }

    // Get agency rules
    const { data: configData } = await supabaseClient
      .from('provider_configs')
      .select('config_value')
      .eq('config_key', 'rules_agency_v1')
      .maybeSingle();

    const agencyRules = configData?.config_value?.[agency] || {};
    
    // Calculate income components
    const components = [];
    let totalMonthlyIncome = 0;
    const warnings = [];

    // Process pay stubs for base income
    const payStubs = documents.filter(d => d.doc_type === 'pay_stub');
    for (const payStub of payStubs) {
      const data = payStub.parsed_json;
      if (data?.hourly_rate && data?.hours_current) {
        const weeklyHours = parseFloat(data.hours_current);
        const hourlyRate = parseFloat(data.hourly_rate);
        const monthlyAmount = (hourlyRate * weeklyHours * 52) / 12;
        
        components.push({
          component_type: 'base_hourly',
          monthly_amount: monthlyAmount,
          calculation_method: 'Hourly rate × weekly hours × 52 ÷ 12',
          source_documents: [payStub.id]
        });
        totalMonthlyIncome += monthlyAmount;
      }
      
      if (data?.gross_current && data?.pay_frequency) {
        const grossCurrent = parseFloat(data.gross_current);
        let monthlyAmount = 0;
        
        switch (data.pay_frequency) {
          case 'weekly':
            monthlyAmount = grossCurrent * 52 / 12;
            break;
          case 'biweekly':
            monthlyAmount = grossCurrent * 26 / 12;
            break;
          case 'semimonthly':
            monthlyAmount = grossCurrent * 2;
            break;
          case 'monthly':
            monthlyAmount = grossCurrent;
            break;
        }
        
        if (monthlyAmount > 0) {
          components.push({
            component_type: 'base_salary',
            monthly_amount: monthlyAmount,
            calculation_method: `${data.pay_frequency} gross × frequency factor`,
            source_documents: [payStub.id]
          });
          totalMonthlyIncome += monthlyAmount;
        }
      }
    }

    // Process W-2s for annual salary verification
    const w2s = documents.filter(d => d.doc_type === 'w2');
    for (const w2 of w2s) {
      const data = w2.parsed_json;
      if (data?.wages) {
        const annualWages = parseFloat(data.wages);
        const monthlyAmount = annualWages / 12;
        
        components.push({
          component_type: 'base_salary',
          monthly_amount: monthlyAmount,
          calculation_method: 'Annual W-2 wages ÷ 12',
          source_documents: [w2.id],
          months_considered: 12
        });
      }
    }

    // Create calculation record
    const { data: calculation, error: calcError } = await supabaseClient
      .from('income_calculations')
      .insert({
        borrower_id,
        agency,
        result_monthly_income: totalMonthlyIncome,
        confidence: Math.min(components.length * 0.25, 1.0),
        warnings,
        inputs_version: 'v1.0'
      })
      .select()
      .single();

    if (calcError) throw calcError;

    // Insert income components
    for (const component of components) {
      await supabaseClient
        .from('income_components')
        .insert({
          ...component,
          calculation_id: calculation.id
        });
    }

    // Log audit event
    await supabaseClient
      .from('income_audit_events')
      .insert({
        calculation_id: calculation.id,
        step: 'calculate',
        payload: {
          agency,
          components_count: components.length,
          monthly_income: totalMonthlyIncome,
          documents_processed: documents.length
        }
      });

    return new Response(JSON.stringify({
      success: true,
      calculation_id: calculation.id,
      monthly_income: totalMonthlyIncome,
      components: components.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Calculation Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});