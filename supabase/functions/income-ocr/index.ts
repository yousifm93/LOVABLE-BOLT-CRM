import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { document_id } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get document info
    const { data: document, error: docError } = await supabaseClient
      .from('income_documents')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update status to processing
    await supabaseClient
      .from('income_documents')
      .update({ ocr_status: 'processing' })
      .eq('id', document_id);

    // Get file from storage
    const { data: fileData } = await supabaseClient.storage
      .from('income-docs')
      .download(document.storage_path);

    if (!fileData) {
      throw new Error('File not found in storage');
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // OCR with OpenAI GPT-4o
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: 'Extract key financial data from this document. Return a JSON object with fields like: employer_name, employee_name, pay_period_start, pay_period_end, pay_frequency, hourly_rate, gross_current, gross_ytd, hours_current, hours_ytd, etc. Identify document type as well.'
          }, {
            type: 'image_url',
            image_url: {
              url: `data:${document.mime_type};base64,${base64}`
            }
          }]
        }],
        max_tokens: 2000
      }),
    });

    const ocrResult = await openaiResponse.json();
    
    let parsedJson = {};
    let confidence = 0.5;
    
    try {
      const extractedText = ocrResult.choices[0].message.content;
      // Try to extract JSON from the response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
        confidence = 0.8;
      }
    } catch (parseError) {
      console.log('Failed to parse OCR result as JSON, using text');
      parsedJson = { raw_text: ocrResult.choices[0].message.content };
      confidence = 0.3;
    }

    // Update document with results
    await supabaseClient
      .from('income_documents')
      .update({
        ocr_status: 'success',
        parsed_json: parsedJson,
        parse_confidence: confidence
      })
      .eq('id', document_id);

    // Log audit event
    await supabaseClient
      .from('income_audit_events')
      .insert({
        document_id: document_id,
        step: 'ocr',
        payload: {
          ocr_provider: 'openai',
          confidence: confidence,
          fields_extracted: Object.keys(parsedJson).length
        }
      });

    return new Response(JSON.stringify({ 
      success: true, 
      document_id,
      confidence 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OCR Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});