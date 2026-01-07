import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as pdfjs from "npm:pdfjs-dist@4.10.38/build/pdf.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from PDF using pdfjs
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    const numPages = pdf.numPages;
    
    console.log(`[parse-rate-lock] PDF has ${numPages} pages`);
    
    // Extract text from each page
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- Page ${i} ---\n${pageText}`;
    }
    
    return fullText;
  } catch (error) {
    console.error('[parse-rate-lock] PDF text extraction failed:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url } = await req.json();
    
    console.log('[parse-rate-lock] Starting to parse rate lock confirmation');
    
    // Download file from signed URL
    const response = await fetch(file_url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log('[parse-rate-lock] File downloaded, size:', blob.size, 'type:', blob.type);
    
    const arrayBuffer = await blob.arrayBuffer();
    let textContent = '';
    let useTextExtraction = true;
    
    // Try text extraction first (works for most PDFs and handles large files)
    try {
      console.log('[parse-rate-lock] Attempting PDF text extraction...');
      textContent = await extractTextFromPDF(arrayBuffer);
      console.log('[parse-rate-lock] Text extracted, length:', textContent.length);
      
      // If text is too short, it might be a scanned PDF - fall back to base64
      if (textContent.trim().length < 100) {
        console.log('[parse-rate-lock] Text too short, might be scanned PDF - falling back to base64');
        useTextExtraction = false;
      }
    } catch (extractError) {
      console.log('[parse-rate-lock] Text extraction failed, falling back to base64:', extractError);
      useTextExtraction = false;
    }
    
    // Use Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }
    
    let aiRequestBody;
    
    if (useTextExtraction && textContent.length > 0) {
      // Use text-based approach (no size limits)
      console.log('[parse-rate-lock] Using text-based AI extraction');
      aiRequestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `Extract the following information from this rate lock confirmation document text. Return ONLY a valid JSON object with these fields:

{
  "note_rate": NUMBER (the interest rate as a decimal, e.g. 6.99 not 6.99%),
  "lock_expiration": "YYYY-MM-DD format (from Expires field)",
  "term": NUMBER (amortization term in months, e.g. 360 for 30 years),
  "prepayment_penalty": "0" | "1" | "2" | "3" | "4" | "5" (years, extract from PPP field like "PPP 5 YR" = "5"),
  "dscr_ratio": NUMBER or null (DSCR ratio if present),
  "escrow_waiver": "Waived" | "Escrowed" (based on Escrow Waiver field)
}

Important:
- Look for "Note Rate" or "Rate" for the interest rate
- Look for "Expires" for the lock expiration date
- Look for "Amortization Term" or infer from program name (30YF = 360 months)
- Look for "Prepayment Penalty" or "PPP" - extract just the number of years (e.g., "PPP 5 YR" = "5", "None" = "0")
- Look for "DSCR Ratio" if this is a DSCR loan
- Look for "Escrow Waiver" field - if it says "Waived" return "Waived", otherwise "Escrowed"

RATE LOCK DOCUMENT TEXT:
${textContent}

Return ONLY the JSON object, no additional text`
        }]
      };
    } else {
      // Fall back to base64 for scanned PDFs (with size limit)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit for base64/image approach
      if (blob.size > MAX_SIZE) {
        throw new Error(`File too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). This appears to be a scanned PDF. Please compress to under 5MB or use a text-based PDF.`);
      }
      
      console.log('[parse-rate-lock] Using base64 image approach for scanned PDF');
      
      // Convert to base64 without using apply (which has argument limits)
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
      
      aiRequestBody = {
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: `Extract the following information from this rate lock confirmation document. Return ONLY a valid JSON object with these fields:

{
  "note_rate": NUMBER (the interest rate as a decimal, e.g. 6.99 not 6.99%),
  "lock_expiration": "YYYY-MM-DD format (from Expires field)",
  "term": NUMBER (amortization term in months, e.g. 360 for 30 years),
  "prepayment_penalty": "0" | "1" | "2" | "3" | "4" | "5" (years, extract from PPP field like "PPP 5 YR" = "5"),
  "dscr_ratio": NUMBER or null (DSCR ratio if present),
  "escrow_waiver": "Waived" | "Escrowed" (based on Escrow Waiver field)
}

Important:
- Look for "Note Rate" or "Rate" for the interest rate
- Look for "Expires" for the lock expiration date
- Look for "Amortization Term" or infer from program name (30YF = 360 months)
- Look for "Prepayment Penalty" or "PPP" - extract just the number of years (e.g., "PPP 5 YR" = "5", "None" = "0")
- Look for "DSCR Ratio" if this is a DSCR loan
- Look for "Escrow Waiver" field - if it says "Waived" return "Waived", otherwise "Escrowed"
- Return ONLY the JSON object, no additional text`
          }, {
            type: 'image_url',
            image_url: {
              url: `data:application/pdf;base64,${base64}`
            }
          }]
        }]
      };
    }
    
    console.log('[parse-rate-lock] Calling AI Gateway...');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(aiRequestBody),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[parse-rate-lock] AI gateway error:', aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content;
    
    console.log('[parse-rate-lock] AI response:', content);
    
    // Parse the extracted value
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not extract rate lock data from AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log('[parse-rate-lock] Successfully extracted data:', parsed);

    // DO NOT update the lead - just return extracted data for client confirmation
    console.log('[parse-rate-lock] Returning extracted data for client confirmation');
    
    return new Response(JSON.stringify({ 
      success: true, 
      extracted_data: parsed,
      extraction_method: useTextExtraction ? 'text' : 'image'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[parse-rate-lock] Error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
