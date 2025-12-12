import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Document-specific extraction prompts
const EXTRACTION_PROMPTS: Record<string, string> = {
  pay_stub: `Extract ALL financial data from this pay stub. Return a JSON object with these exact fields:
{
  "document_type": "pay_stub",
  "employee_name": "Full employee name",
  "employer_name": "Employer/company name",
  "pay_period_start": "YYYY-MM-DD format",
  "pay_period_end": "YYYY-MM-DD format",
  "pay_date": "YYYY-MM-DD format",
  "pay_frequency": "weekly|biweekly|semimonthly|monthly",
  "hourly_rate": number or null,
  "regular_hours_current": number,
  "overtime_hours_current": number or 0,
  "gross_current": number (current period gross pay),
  "regular_pay_current": number,
  "overtime_pay_current": number or 0,
  "bonus_current": number or 0,
  "commission_current": number or 0,
  "tips_current": number or 0,
  "other_income_current": number or 0,
  "gross_ytd": number (year-to-date gross),
  "regular_pay_ytd": number,
  "overtime_pay_ytd": number or 0,
  "bonus_ytd": number or 0,
  "commission_ytd": number or 0,
  "tips_ytd": number or 0,
  "hours_ytd": number or null,
  "federal_tax_current": number,
  "federal_tax_ytd": number,
  "state_tax_current": number,
  "state_tax_ytd": number,
  "social_security_current": number,
  "medicare_current": number,
  "net_pay_current": number,
  "extraction_confidence": 0.0-1.0
}
Be precise with numbers. If a field is not visible, use null.`,

  w2: `Extract ALL data from this W-2 form. Return a JSON object with these exact fields:
{
  "document_type": "w2",
  "tax_year": number (4-digit year),
  "employee_name": "Full employee name",
  "employee_ssn_last4": "last 4 digits only",
  "employer_name": "Employer name",
  "employer_ein": "Employer ID number",
  "employer_address": "Full address",
  "box1_wages": number (Wages, tips, other compensation),
  "box2_fed_tax": number (Federal income tax withheld),
  "box3_ss_wages": number (Social security wages),
  "box4_ss_tax": number (Social security tax withheld),
  "box5_medicare_wages": number (Medicare wages and tips),
  "box6_medicare_tax": number (Medicare tax withheld),
  "box7_ss_tips": number or 0,
  "box8_allocated_tips": number or 0,
  "box10_dependent_care": number or 0,
  "box11_nonqualified_plans": number or 0,
  "box12_codes": [{"code": "X", "amount": number}] or [],
  "box13_statutory": boolean,
  "box13_retirement": boolean,
  "box13_sick_pay": boolean,
  "box14_other": string or null,
  "extraction_confidence": 0.0-1.0
}`,

  form_1099: `Extract ALL data from this 1099 form. Identify the specific type (1099-NEC, 1099-MISC, etc). Return JSON:
{
  "document_type": "form_1099",
  "form_subtype": "1099-NEC|1099-MISC|1099-INT|1099-DIV|1099-K",
  "tax_year": number,
  "payer_name": "Payer/company name",
  "payer_tin": "TIN if visible",
  "recipient_name": "Recipient name",
  "recipient_tin_last4": "last 4 digits",
  "box1_nonemployee_comp": number or null (1099-NEC),
  "box1_rents": number or null (1099-MISC),
  "box2_royalties": number or null,
  "box3_other_income": number or null,
  "box7_payer_direct_sales": number or null,
  "gross_amount": number (total taxable amount),
  "extraction_confidence": 0.0-1.0
}`,

  form_1040: `Extract key income data from this 1040 tax return. Return JSON:
{
  "document_type": "form_1040",
  "tax_year": number,
  "taxpayer_name": "Primary taxpayer name",
  "spouse_name": "Spouse name or null",
  "filing_status": "single|married_filing_jointly|married_filing_separately|head_of_household",
  "line1_wages": number (Total wages from W-2s),
  "line2a_tax_exempt_interest": number or 0,
  "line2b_taxable_interest": number or 0,
  "line3a_qualified_dividends": number or 0,
  "line3b_ordinary_dividends": number or 0,
  "line4a_ira_distributions": number or 0,
  "line4b_taxable_ira": number or 0,
  "line5a_pensions": number or 0,
  "line5b_taxable_pensions": number or 0,
  "line6a_social_security": number or 0,
  "line6b_taxable_ss": number or 0,
  "line7_capital_gain_loss": number or 0,
  "line8_schedule1_income": number or 0,
  "line9_total_income": number (AGI before adjustments),
  "line11_agi": number (Adjusted Gross Income),
  "schedule_c_attached": boolean,
  "schedule_e_attached": boolean,
  "schedule_f_attached": boolean,
  "extraction_confidence": 0.0-1.0
}`,

  schedule_c: `Extract Schedule C (Sole Proprietor) data. Return JSON:
{
  "document_type": "schedule_c",
  "tax_year": number,
  "business_name": "Business name",
  "business_code": "Principal business code",
  "accounting_method": "cash|accrual",
  "line1_gross_receipts": number,
  "line2_returns_allowances": number or 0,
  "line3_net_receipts": number,
  "line4_cost_of_goods_sold": number or 0,
  "line5_gross_profit": number,
  "line6_other_income": number or 0,
  "line7_gross_income": number,
  "line8_advertising": number or 0,
  "line9_car_truck": number or 0,
  "line10_commissions": number or 0,
  "line11_contract_labor": number or 0,
  "line12_depletion": number or 0,
  "line13_depreciation": number or 0,
  "line14_employee_benefit": number or 0,
  "line15_insurance": number or 0,
  "line16a_interest_mortgage": number or 0,
  "line16b_interest_other": number or 0,
  "line17_legal_professional": number or 0,
  "line18_office_expense": number or 0,
  "line19_pension_profit_sharing": number or 0,
  "line20a_rent_vehicles": number or 0,
  "line20b_rent_other": number or 0,
  "line21_repairs": number or 0,
  "line22_supplies": number or 0,
  "line23_taxes_licenses": number or 0,
  "line24a_travel": number or 0,
  "line24b_meals": number or 0 (50% deductible),
  "line25_utilities": number or 0,
  "line26_wages": number or 0,
  "line27_other_expenses": number or 0,
  "line28_total_expenses": number,
  "line29_tentative_profit": number,
  "line30_home_office": number or 0,
  "line31_net_profit_loss": number (THIS IS KEY FOR INCOME),
  "extraction_confidence": 0.0-1.0
}`,

  schedule_e: `Extract Schedule E (Rental/Partnership) data. Return JSON:
{
  "document_type": "schedule_e",
  "tax_year": number,
  "properties": [
    {
      "address": "Property address",
      "property_type": "single_family|multi_family|vacation|commercial",
      "days_rented": number,
      "personal_use_days": number,
      "rents_received": number,
      "advertising": number or 0,
      "auto_travel": number or 0,
      "cleaning": number or 0,
      "commissions": number or 0,
      "insurance": number or 0,
      "legal_professional": number or 0,
      "management_fees": number or 0,
      "mortgage_interest": number or 0,
      "other_interest": number or 0,
      "repairs": number or 0,
      "supplies": number or 0,
      "taxes": number or 0,
      "utilities": number or 0,
      "depreciation": number or 0,
      "other_expenses": number or 0,
      "total_expenses": number,
      "net_income_loss": number
    }
  ],
  "total_rental_income": number,
  "total_rental_expenses": number,
  "total_rental_net": number,
  "k1_income_partnerships": number or 0,
  "k1_income_s_corps": number or 0,
  "k1_income_estates_trusts": number or 0,
  "extraction_confidence": 0.0-1.0
}`,

  k1: `Extract K-1 (Partnership/S-Corp) data. Return JSON:
{
  "document_type": "k1",
  "form_type": "1065|1120S|1041",
  "tax_year": number,
  "entity_name": "Partnership/S-Corp name",
  "entity_ein": "EIN",
  "partner_shareholder_name": "Name",
  "ownership_percentage": number (0-100),
  "box1_ordinary_income": number (CRITICAL for qualifying income),
  "box2_net_rental_income": number or 0,
  "box3_other_net_rental": number or 0,
  "box4_guaranteed_payments": number or 0 (ADD to qualifying income),
  "box5_interest": number or 0,
  "box6_dividends": number or 0,
  "box7_royalties": number or 0,
  "box8_net_short_term_gain": number or 0,
  "box9_net_long_term_gain": number or 0,
  "box10_net_1231_gain": number or 0,
  "box11_other_income": number or 0,
  "box12_section_179": number or 0,
  "box13_other_deductions": number or 0,
  "box14_self_employment": number or 0,
  "box16_distributions": number or 0,
  "extraction_confidence": 0.0-1.0
}`,

  voe: `Extract Verification of Employment data. Return JSON:
{
  "document_type": "voe",
  "verification_date": "YYYY-MM-DD",
  "employer_name": "Employer name",
  "employer_address": "Full address",
  "employer_phone": "Phone number",
  "employee_name": "Employee name",
  "employee_title": "Job title/position",
  "employment_start_date": "YYYY-MM-DD",
  "employment_end_date": "YYYY-MM-DD or null if current",
  "is_current_employee": boolean,
  "employment_type": "full_time|part_time|seasonal|contract",
  "pay_frequency": "weekly|biweekly|semimonthly|monthly|annual",
  "base_pay_amount": number,
  "base_pay_period": "hourly|weekly|biweekly|semimonthly|monthly|annual",
  "hours_per_week": number,
  "overtime_eligible": boolean,
  "avg_overtime_hours": number or 0,
  "avg_overtime_amount_ytd": number or 0,
  "avg_bonus_amount_ytd": number or 0,
  "avg_commission_amount_ytd": number or 0,
  "other_income_ytd": number or 0,
  "ytd_earnings": number,
  "prior_year_earnings": number or null,
  "prior_year2_earnings": number or null,
  "probability_of_continued_employment": "good|uncertain|terminating",
  "verifier_name": "Person who completed VOE",
  "verifier_title": "Their title",
  "extraction_confidence": 0.0-1.0
}`,

  default: `Extract all financial and identifying data from this document. Identify the document type first (pay stub, W-2, 1099, tax return, Schedule C, Schedule E, K-1, VOE, bank statement, etc.). Return a JSON object with:
{
  "document_type": "identified type",
  "detected_fields": { all extracted field:value pairs },
  "key_income_amounts": [list of income-related amounts found],
  "date_information": { any dates found },
  "extraction_confidence": 0.0-1.0
}`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Store parsed body for potential reuse in error handler
  let parsedBody: { document_id?: string; force_reprocess?: boolean; expected_doc_type?: string } = {};

  try {
    parsedBody = await req.json();
    const { document_id, force_reprocess, expected_doc_type } = parsedBody;
    
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

    // Skip if already processed (unless force)
    if (document.ocr_status === 'success' && !force_reprocess) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Already processed',
        document_id,
        parsed_json: document.parsed_json
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update status to processing
    await supabaseClient
      .from('income_documents')
      .update({ ocr_status: 'processing' })
      .eq('id', document_id);

    // Get file from storage
    const { data: fileData, error: fileError } = await supabaseClient.storage
      .from('income-docs')
      .download(document.storage_path);

    if (fileError || !fileData) {
      throw new Error('File not found in storage: ' + (fileError?.message || 'Unknown error'));
    }

    // Convert to base64 - using chunked approach to avoid stack overflow on large files
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);

    // Determine which prompt to use
    const docType = expected_doc_type || document.doc_type || 'default';
    const extractionPrompt = EXTRACTION_PROMPTS[docType] || EXTRACTION_PROMPTS.default;

    console.log(`Processing document ${document_id} as type: ${docType}, mime: ${document.mime_type}`);

    // Check if file is an image type supported by OpenAI Vision
    const supportedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const mimeTypeLower = document.mime_type?.toLowerCase() || '';
    const isImage = supportedImageTypes.includes(mimeTypeLower);
    const isPdf = mimeTypeLower === 'application/pdf' || 
                  document.file_name?.toLowerCase().endsWith('.pdf') ||
                  document.storage_path?.toLowerCase().endsWith('.pdf');

    if (!isImage && !isPdf) {
      throw new Error(`Unsupported file type: ${document.mime_type}. Please upload images (PNG, JPG, WEBP, GIF) or PDF files.`);
    }

    let openaiResponse;

    if (isPdf) {
      // For PDFs, use the OpenAI Files API to upload the file first, then use with Assistants/Vision
      // Alternative: Use GPT-4o with document understanding (not vision API for PDFs)
      console.log('Processing PDF using OpenAI document analysis...');
      
      // Upload the PDF file to OpenAI
      const formData = new FormData();
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
      formData.append('file', blob, document.file_name || 'document.pdf');
      formData.append('purpose', 'assistants');
      
      const uploadResponse = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        },
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        console.error('OpenAI file upload error:', uploadError);
        throw new Error(`Failed to upload PDF to OpenAI: ${uploadResponse.status}`);
      }
      
      const uploadResult = await uploadResponse.json();
      const fileId = uploadResult.id;
      console.log('PDF uploaded to OpenAI with file ID:', fileId);
      
      // Use chat completions with file reference for document analysis
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'You are an expert financial document analyzer. Extract data precisely and return valid JSON only. Be accurate with numbers - do not round or estimate. If you cannot read a value clearly, use null.'
          }, {
            role: 'user',
            content: [{
              type: 'text',
              text: extractionPrompt
            }, {
              type: 'file',
              file: {
                file_id: fileId
              }
            }]
          }],
          max_tokens: 4000,
          temperature: 0.1
        }),
      });
      
      // Clean up: delete the uploaded file after processing
      try {
        await fetch(`https://api.openai.com/v1/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          },
        });
        console.log('Cleaned up uploaded file:', fileId);
      } catch (cleanupError) {
        console.warn('Failed to cleanup file, will expire automatically:', cleanupError);
      }
    } else {
      // For images, use vision API with base64
      openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{
            role: 'system',
            content: 'You are an expert financial document analyzer. Extract data precisely and return valid JSON only. Be accurate with numbers - do not round or estimate. If you cannot read a value clearly, use null.'
          }, {
            role: 'user',
            content: [{
              type: 'text',
              text: extractionPrompt
            }, {
              type: 'image_url',
              image_url: {
                url: `data:${document.mime_type};base64,${base64}`,
                detail: 'high'
              }
            }]
          }],
          max_tokens: 4000,
          temperature: 0.1
        }),
      });
    }

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const ocrResult = await openaiResponse.json();
    
    let parsedJson: any = {};
    let confidence = 0.5;
    let detectedDocType = docType;
    
    try {
      const extractedText = ocrResult.choices[0].message.content;
      console.log('Raw OCR response:', extractedText.substring(0, 500));
      
      // Try to extract JSON from the response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedJson = JSON.parse(jsonMatch[0]);
        
        // Get confidence from parsed result or calculate
        confidence = parsedJson.extraction_confidence || 0.8;
        
        // Update detected doc type if returned
        if (parsedJson.document_type) {
          detectedDocType = parsedJson.document_type;
        }
      }
    } catch (parseError) {
      console.error('Failed to parse OCR result as JSON:', parseError);
      parsedJson = { 
        raw_text: ocrResult.choices[0].message.content,
        parse_error: true 
      };
      confidence = 0.3;
    }

    // Extract period dates if available
    let docPeriodStart = null;
    let docPeriodEnd = null;
    if (parsedJson.pay_period_start) docPeriodStart = parsedJson.pay_period_start;
    if (parsedJson.pay_period_end) docPeriodEnd = parsedJson.pay_period_end;

    // Update document with results (tax_year stored in parsed_json, not as separate column)
    const { error: updateError } = await supabaseClient
      .from('income_documents')
      .update({
        ocr_status: 'success',
        parsed_json: parsedJson,
        parse_confidence: confidence,
        doc_type: detectedDocType !== 'default' ? detectedDocType : document.doc_type,
        doc_period_start: docPeriodStart,
        doc_period_end: docPeriodEnd
      })
      .eq('id', document_id);

    if (updateError) {
      console.error('Error updating document:', updateError);
    }

    // Log audit event
    await supabaseClient
      .from('income_audit_events')
      .insert({
        document_id: document_id,
        step: 'ocr',
        payload: {
          ocr_provider: 'openai_gpt4o',
          confidence: confidence,
          detected_doc_type: detectedDocType,
          fields_extracted: Object.keys(parsedJson).length,
          model: 'gpt-4o',
          has_period_dates: !!(docPeriodStart || docPeriodEnd),
          tax_year: parsedJson.tax_year || null
        }
      });

    console.log(`Successfully processed document ${document_id} with confidence ${confidence}`);

    return new Response(JSON.stringify({ 
      success: true, 
      document_id,
      confidence,
      detected_doc_type: detectedDocType,
      fields_extracted: Object.keys(parsedJson).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('OCR Error:', error);
    
    // Try to update document status to failed using stored body
    if (parsedBody.document_id) {
      try {
        const supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        
        await supabaseClient
          .from('income_documents')
          .update({ 
            ocr_status: 'failed',
            parsed_json: { error: error.message }
          })
          .eq('id', parsedBody.document_id);
      } catch (e) {
        console.error('Failed to update document status:', e);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
