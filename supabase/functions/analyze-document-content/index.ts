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
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const { fileName, mimeType, borrowerLastName } = await req.json();

    if (!fileName) {
      throw new Error('fileName is required');
    }

    console.log('Analyzing document:', { fileName, mimeType, borrowerLastName });

    // Create a prompt to analyze the document name and suggest a better label
    const prompt = `Analyze this document filename and suggest a professional, descriptive label for it.

Document filename: "${fileName}"
File type: ${mimeType || 'Unknown'}
${borrowerLastName ? `Borrower last name: ${borrowerLastName}` : ''}

Based on the filename, determine what type of document this is. Common mortgage document types include:
- Certificate of Liability Insurance
- Homeowners Insurance Policy
- Title Insurance Policy
- Appraisal Report
- Contract/Purchase Agreement
- Rate Lock Confirmation
- Loan Estimate
- Closing Disclosure
- Pay Stubs
- W-2 Forms
- Tax Returns
- Bank Statements
- Credit Report
- Property Survey
- Home Inspection Report
- HOA Documents
- Condo Questionnaire
- Mortgage Statement
- Verification of Employment
- Gift Letter

Return ONLY a JSON object with this exact format:
{
  "suggestedName": "The suggested descriptive name (e.g., 'Certificate of Liability Insurance')",
  "documentType": "The document category (e.g., 'Insurance', 'Financial', 'Property', 'Legal')",
  "confidence": 0.85
}

If the filename is unclear, make your best guess based on any keywords. If you cannot determine the type at all, use the original filename cleaned up.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { 
            role: 'system', 
            content: 'You are a document classification expert specializing in mortgage and real estate documents. Always respond with valid JSON only, no markdown or extra text.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      // Return a fallback based on filename analysis
      return new Response(JSON.stringify({
        suggestedName: cleanupFileName(fileName),
        documentType: 'Document',
        confidence: 0.3,
        fallback: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Try to parse the JSON response
    let result;
    try {
      // Clean up potential markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      result = {
        suggestedName: cleanupFileName(fileName),
        documentType: 'Document',
        confidence: 0.3,
        fallback: true
      };
    }

    // Add borrower last name if provided and not already in the name
    if (borrowerLastName && result.suggestedName && !result.suggestedName.toLowerCase().includes(borrowerLastName.toLowerCase())) {
      result.suggestedNameWithBorrower = `${result.suggestedName} - ${borrowerLastName}`;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-document-content:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      suggestedName: 'Document',
      documentType: 'Unknown',
      confidence: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function cleanupFileName(fileName: string): string {
  // Remove file extension
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  // Replace underscores and dashes with spaces
  const cleaned = nameWithoutExt.replace(/[_-]/g, ' ');
  // Remove extra whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}
