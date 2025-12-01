import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url } = await req.json();
    
    console.log('[parse-appraisal] Starting to parse appraisal from URL');
    
    // Download file from signed URL
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('[parse-appraisal] File downloaded, size:', blob.size, 'type:', blob.type);
    
    // Convert to base64 in chunks to avoid stack overflow on large files
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192; // Process 8KB at a time
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    const base64 = btoa(binary);
    console.log('[parse-appraisal] Converted to base64, length:', base64.length);
    
    // Use Lovable AI Gateway with Gemini Vision
    console.log('[parse-appraisal] Calling AI Gateway...');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: `Extract the final appraised value from this appraisal report. 
                   Look for the "opinion of market value" or "Indicated Value" in the reconciliation section.
                   Return ONLY a JSON object: { "appraised_value": NUMBER }
                   The value should be a number without dollar signs or commas.`
          }, {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${base64}`
            }
          }]
        }]
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[parse-appraisal] AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;
    
    console.log('[parse-appraisal] AI response:', JSON.stringify(result));
    
    // Parse the extracted value
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[parse-appraisal] Successfully extracted value:', parsed.appraised_value);
      
      return new Response(JSON.stringify({ 
        success: true, 
        appraised_value: parsed.appraised_value 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    throw new Error('Could not extract appraised value from AI response');
  } catch (error) {
    console.error('[parse-appraisal] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
