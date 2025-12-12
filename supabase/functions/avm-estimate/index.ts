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

const rentcastApiKey = Deno.env.get('RENTCAST_API_KEY');

interface EstimateRequest {
  address: string;
  beds?: number;
  baths?: number;
  squareFootage?: number;
  mode: 'internal' | 'public';
}

interface RentcastResponse {
  price: number;
  priceRangeLow: number;
  priceRangeHigh: number;
  pricePerSquareFoot?: number;
  comparables?: Array<{
    formattedAddress: string;
    distance: number;
    bedrooms: number;
    bathrooms: number;
    squareFootage: number;
    price: number;
    listedDate?: string;
    correlationScore?: number;
  }>;
}

async function fetchRentcastEstimate(address: string, beds?: number, baths?: number, sqft?: number) {
  const params = new URLSearchParams({ address });
  if (beds) params.append('bedrooms', beds.toString());
  if (baths) params.append('bathrooms', baths.toString());
  if (sqft) params.append('squareFootage', sqft.toString());

  console.log(`Calling Rentcast API for address: ${address}`);

  const response = await fetch(`https://api.rentcast.io/v1/avm/value?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'X-Api-Key': rentcastApiKey || '',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Rentcast API error: ${response.status} - ${errorText}`);
    throw new Error(`Rentcast API error: ${response.status}`);
  }

  const data: RentcastResponse = await response.json();
  console.log('Rentcast API response received:', JSON.stringify(data).substring(0, 500));

  // Map Rentcast response to our format
  const comps = (data.comparables || []).map(comp => ({
    address: comp.formattedAddress,
    distance_miles: Math.round(comp.distance * 10) / 10,
    beds: comp.bedrooms,
    baths: comp.bathrooms,
    sqft: comp.squareFootage,
    sale_price: comp.price,
    sale_date: comp.listedDate || null,
    photo_url: null
  }));

  // Calculate confidence based on price range spread
  const priceSpread = data.priceRangeHigh - data.priceRangeLow;
  const confidence = Math.max(0.5, Math.min(0.95, 1 - (priceSpread / data.price / 2)));

  return {
    estimate: data.price,
    low: data.priceRangeLow,
    high: data.priceRangeHigh,
    confidence: Math.round(confidence * 100) / 100,
    provider: "rentcast",
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

    // Call Rentcast API
    const result = await fetchRentcastEstimate(address, beds, baths, squareFootage);
    
    const { data: requestData, error: requestError } = await supabase
      .from('valuation_requests')
      .insert({
        mode,
        address,
        beds,
        baths,
        sqft: squareFootage,
        requester_type: mode,
        provider_primary: 'rentcast',
        provider_used: 'rentcast',
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
        estimate: result.estimate,
        low: result.low,
        high: result.high,
        confidence: result.confidence,
        provider_payload: result,
        cached_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();

    if (valuationError) {
      console.error('Error storing valuation:', valuationError);
      throw valuationError;
    }

    // Store comparables
    if (result.comps?.length) {
      const { error: compsError } = await supabase
        .from('valuation_comparables')
        .insert(
          result.comps.map(comp => ({
            valuation_id: valuationData.id,
            ...comp
          }))
        );

      if (compsError) {
        console.error('Error storing comparables:', compsError);
      }
    }

    console.log(`Successfully processed valuation for ${address}`);
    return new Response(JSON.stringify(result), {
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