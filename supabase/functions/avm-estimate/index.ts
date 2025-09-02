import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface EstimateRequest {
  address: string;
  beds?: number;
  baths?: number;
  squareFootage?: number;
  mode: 'internal' | 'public';
}

function generateMockData(address: string, beds?: number, baths?: number, sqft?: number) {
  // Generate somewhat realistic mock data based on address
  const baseEstimate = 400000 + (Math.random() * 400000); // $400k-800k base
  const variance = baseEstimate * 0.15; // 15% variance
  
  const estimate = Math.round(baseEstimate);
  const low = Math.round(estimate - variance);
  const high = Math.round(estimate + variance);
  const confidence = 0.6 + (Math.random() * 0.3); // 60-90% confidence

  const comps = Array.from({ length: 4 }, (_, i) => ({
    address: `${123 + i} Mock Street, Miami, FL 33101`,
    distance_miles: Math.round((0.1 + Math.random() * 0.8) * 10) / 10,
    beds: beds || (2 + Math.floor(Math.random() * 3)),
    baths: baths || (1 + Math.floor(Math.random() * 2.5)),
    sqft: sqft || Math.round(1200 + Math.random() * 800),
    sale_price: Math.round(estimate * (0.9 + Math.random() * 0.2)),
    sale_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    photo_url: null
  }));

  return {
    estimate,
    low,
    high,
    confidence: Math.round(confidence * 100) / 100,
    provider: "mock",
    cached: false,
    comps
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    const { address, beds, baths, squareFootage, mode }: EstimateRequest = await req.json();
    
    if (!address) {
      return new Response(JSON.stringify({ error: 'Address is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Processing valuation request for: ${address}, mode: ${mode}`);

    // Check cache first
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: cachedValuation } = await supabase
      .from('valuation_requests')
      .select(`
        *,
        property_valuations (*),
        property_valuations (
          valuation_comparables (*)
        )
      `)
      .eq('address', address)
      .eq('status', 'success')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (cachedValuation?.property_valuations?.[0]) {
      console.log('Returning cached valuation');
      const valuation = cachedValuation.property_valuations[0];
      return new Response(JSON.stringify({
        estimate: Number(valuation.estimate),
        low: Number(valuation.low),
        high: Number(valuation.high),
        confidence: Number(valuation.confidence),
        provider: cachedValuation.provider_used,
        cached: true,
        cachedDaysAgo: Math.floor((Date.now() - new Date(cachedValuation.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        comps: valuation.valuation_comparables || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate mock data since no API keys are available
    const mockResult = generateMockData(address, beds, baths, squareFootage);
    
    // Store the request and results
    const { data: requestData, error: requestError } = await supabase
      .from('valuation_requests')
      .insert({
        mode,
        address,
        beds,
        baths,
        sqft: squareFootage,
        requester_type: mode,
        provider_primary: 'mock',
        provider_used: 'mock',
        status: 'success'
      })
      .select()
      .single();

    if (requestError) {
      console.error('Error storing valuation request:', requestError);
      throw requestError;
    }

    // Store the valuation
    const { data: valuationData, error: valuationError } = await supabase
      .from('property_valuations')
      .insert({
        request_id: requestData.id,
        estimate: mockResult.estimate,
        low: mockResult.low,
        high: mockResult.high,
        confidence: mockResult.confidence,
        provider_payload: mockResult,
        cached_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (valuationError) {
      console.error('Error storing valuation:', valuationError);
      throw valuationError;
    }

    // Store comparables
    if (mockResult.comps?.length) {
      const { error: compsError } = await supabase
        .from('valuation_comparables')
        .insert(
          mockResult.comps.map(comp => ({
            valuation_id: valuationData.id,
            ...comp
          }))
        );

      if (compsError) {
        console.error('Error storing comparables:', compsError);
      }
    }

    console.log(`Successfully processed valuation for ${address}`);
    return new Response(JSON.stringify(mockResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in avm-estimate function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to process valuation request',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});