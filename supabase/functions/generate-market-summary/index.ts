import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pricing_run_id } = await req.json();
    console.log('generate-market-summary: Processing run', pricing_run_id);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the pricing run results
    const { data: pricingRun, error: fetchError } = await supabase
      .from('pricing_runs')
      .select('*')
      .eq('id', pricing_run_id)
      .single();

    if (fetchError || !pricingRun) {
      throw new Error(`Pricing run not found: ${fetchError?.message}`);
    }

    if (pricingRun.status !== 'completed') {
      throw new Error(`Pricing run not completed yet: ${pricingRun.status}`);
    }

    // Extract rate from results (assuming rate is in result_json)
    const resultJson = pricingRun.result_json || {};
    const rate30yr = resultJson.rate || resultJson.interest_rate || 6.875; // Default fallback

    // Get yesterday's rate for comparison
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { data: yesterdayData } = await supabase
      .from('daily_market_updates')
      .select('rate_30yr_fixed')
      .eq('date', yesterdayStr)
      .single();

    const previousRate = yesterdayData?.rate_30yr_fixed || rate30yr;
    const rateChange = Number((rate30yr - previousRate).toFixed(3));
    const changeDirection = rateChange > 0 ? 'up' : rateChange < 0 ? 'down' : 'unchanged';

    // Generate AI market summary
    const prompt = `You are a mortgage market analyst writing a brief daily update for loan officers.

Today's rates:
- 30-year fixed conventional: ${rate30yr}% (${changeDirection === 'up' ? '↑' : changeDirection === 'down' ? '↓' : '—'} ${Math.abs(rateChange)}% from yesterday)

Write 2-3 sentences summarizing today's mortgage market conditions. Be concise, professional, and mention the rate direction. Do not use any markdown formatting or bullet points. Just plain text paragraphs.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a mortgage market analyst. Keep responses brief and professional.' },
          { role: 'user', content: prompt }
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const marketSummary = aiData.choices?.[0]?.message?.content || 'Market update unavailable.';

    // Store in daily_market_updates
    const today = new Date().toISOString().split('T')[0];
    
    const { error: upsertError } = await supabase
      .from('daily_market_updates')
      .upsert({
        date: today,
        rate_30yr_fixed: rate30yr,
        rate_15yr_fixed: rate30yr - 0.625, // Typically 15yr is ~0.625% lower
        rate_30yr_fha: rate30yr - 0.375, // FHA typically slightly lower
        rate_bank_statement: rate30yr, // Same as conventional for now
        rate_dscr: rate30yr, // Same as conventional for now
        change_30yr_fixed: rateChange,
        change_15yr_fixed: rateChange,
        change_30yr_fha: rateChange,
        ai_market_summary: marketSummary,
        pricing_run_id: pricing_run_id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      });

    if (upsertError) {
      throw new Error(`Failed to save market update: ${upsertError.message}`);
    }

    console.log('Market summary generated and saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        rate: rate30yr,
        change: rateChange,
        summary: marketSummary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-market-summary:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
