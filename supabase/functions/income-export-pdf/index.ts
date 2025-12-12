import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Form 1084 style HTML template
function generateForm1084HTML(calculation: any, components: any[], documents: any[], borrower: any): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Categorize components
  const baseIncome = components.filter(c => 
    ['base_hourly', 'base_salary', 'w2_income', 'voe_verified'].includes(c.component_type)
  );
  const variableIncome = components.filter(c => 
    ['overtime', 'bonus', 'commission', 'variable_income_ytd'].includes(c.component_type)
  );
  const selfEmploymentIncome = components.filter(c => 
    ['self_employment', 'schedule_c'].includes(c.component_type)
  );
  const rentalIncome = components.filter(c => 
    ['rental_income', 'schedule_e'].includes(c.component_type)
  );
  const otherIncome = components.filter(c => 
    ['k1_income', 'other'].includes(c.component_type)
  );

  const subtotalBase = baseIncome.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
  const subtotalVariable = variableIncome.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
  const subtotalSelfEmp = selfEmploymentIncome.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
  const subtotalRental = rentalIncome.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);
  const subtotalOther = otherIncome.reduce((sum, c) => sum + (c.monthly_amount || 0), 0);

  return `<!DOCTYPE html>
<html>
<head>
  <title>Fannie Mae Form 1084 - Monthly Income Worksheet</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      font-size: 11px; 
      line-height: 1.4;
      padding: 0.5in;
      max-width: 8.5in;
      margin: 0 auto;
    }
    .header { 
      text-align: center; 
      border-bottom: 2px solid #000; 
      padding-bottom: 10px; 
      margin-bottom: 15px; 
    }
    .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
    .header h2 { font-size: 12px; font-weight: normal; }
    
    .borrower-info {
      display: flex;
      justify-content: space-between;
      border: 1px solid #000;
      padding: 10px;
      margin-bottom: 15px;
      background: #f9f9f9;
    }
    .borrower-info div { flex: 1; }
    .borrower-info label { font-weight: bold; display: block; font-size: 9px; color: #666; }
    .borrower-info span { font-size: 12px; }
    
    .section { margin-bottom: 15px; }
    .section-header { 
      background: #e0e0e0; 
      padding: 5px 10px; 
      font-weight: bold; 
      border: 1px solid #000;
      border-bottom: none;
    }
    .section-content { 
      border: 1px solid #000; 
      padding: 10px; 
    }
    
    .income-table { width: 100%; border-collapse: collapse; }
    .income-table th, .income-table td { 
      padding: 6px 8px; 
      text-align: left; 
      border-bottom: 1px solid #ddd;
    }
    .income-table th { 
      background: #f5f5f5; 
      font-size: 10px; 
      font-weight: bold;
    }
    .income-table .amount { text-align: right; font-family: monospace; }
    .income-table .subtotal { 
      font-weight: bold; 
      background: #f0f0f0;
    }
    .income-table .total { 
      font-weight: bold; 
      font-size: 13px;
      background: #d0d0d0;
    }
    .income-table .method { font-size: 9px; color: #666; }
    .income-table .trend-up { color: #0a0; }
    .income-table .trend-down { color: #a00; }
    
    .warnings {
      background: #fff3cd;
      border: 1px solid #ffc107;
      padding: 10px;
      margin-bottom: 15px;
    }
    .warnings h4 { color: #856404; margin-bottom: 5px; }
    .warnings li { margin-left: 20px; color: #856404; }
    
    .documents-list {
      font-size: 10px;
      columns: 2;
      column-gap: 20px;
    }
    .documents-list li { 
      margin-bottom: 3px;
      break-inside: avoid;
    }
    
    .footer {
      border-top: 2px solid #000;
      padding-top: 15px;
      margin-top: 20px;
    }
    .signature-line {
      display: flex;
      justify-content: space-between;
      margin-top: 30px;
    }
    .signature-line div {
      width: 30%;
      border-top: 1px solid #000;
      padding-top: 5px;
      text-align: center;
      font-size: 10px;
    }
    
    .confidence-bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .confidence-fill {
      height: 100%;
      background: #4caf50;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MONTHLY QUALIFYING INCOME WORKSHEET</h1>
    <h2>Fannie Mae Form 1084 Equivalent | Self-Employment Income Analysis</h2>
  </div>

  <div class="borrower-info">
    <div>
      <label>Borrower Name</label>
      <span>${borrower.first_name} ${borrower.last_name}</span>
    </div>
    <div>
      <label>Calculation Date</label>
      <span>${formatDate(calculation.created_at)}</span>
    </div>
    <div>
      <label>Agency Guidelines</label>
      <span>${(calculation.agency || 'Fannie Mae').toUpperCase()}</span>
    </div>
    <div>
      <label>Confidence Score</label>
      <span>${Math.round((calculation.confidence || 0) * 100)}%</span>
      <div class="confidence-bar">
        <div class="confidence-fill" style="width: ${(calculation.confidence || 0) * 100}%"></div>
      </div>
    </div>
  </div>

  ${calculation.warnings && calculation.warnings.length > 0 ? `
  <div class="warnings">
    <h4>⚠ Underwriting Notes & Warnings</h4>
    <ul>
      ${calculation.warnings.map((w: string) => `<li>${w}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-header">INCOME CALCULATION DETAIL</div>
    <div class="section-content">
      <table class="income-table">
        <thead>
          <tr>
            <th style="width: 25%">Income Type</th>
            <th style="width: 40%">Calculation Method</th>
            <th style="width: 15%" class="amount">Year 1</th>
            <th style="width: 15%" class="amount">Year 2</th>
            <th style="width: 15%" class="amount">Monthly</th>
          </tr>
        </thead>
        <tbody>
          ${baseIncome.length > 0 ? `
            <tr class="subtotal">
              <td colspan="4"><strong>BASE/SALARY INCOME</strong></td>
              <td class="amount">${formatCurrency(subtotalBase)}</td>
            </tr>
            ${baseIncome.map(c => `
              <tr>
                <td>${c.component_type.replace(/_/g, ' ').toUpperCase()}</td>
                <td class="method">${c.calculation_method || '-'}</td>
                <td class="amount">${c.year1_amount ? formatCurrency(c.year1_amount) : '-'}</td>
                <td class="amount">${c.year2_amount ? formatCurrency(c.year2_amount) : '-'}</td>
                <td class="amount">${formatCurrency(c.monthly_amount)}</td>
              </tr>
            `).join('')}
          ` : ''}
          
          ${variableIncome.length > 0 ? `
            <tr class="subtotal">
              <td colspan="4"><strong>VARIABLE INCOME (OT/Bonus/Commission)</strong></td>
              <td class="amount">${formatCurrency(subtotalVariable)}</td>
            </tr>
            ${variableIncome.map(c => `
              <tr>
                <td>
                  ${c.component_type.replace(/_/g, ' ').toUpperCase()}
                  ${c.trend_direction ? `<span class="${c.trend_direction === 'up' ? 'trend-up' : c.trend_direction === 'down' ? 'trend-down' : ''}">(${c.trend_direction === 'up' ? '↑' : c.trend_direction === 'down' ? '↓' : '→'} ${Math.abs(c.trend_percentage || 0).toFixed(1)}%)</span>` : ''}
                </td>
                <td class="method">${c.calculation_method || '-'}</td>
                <td class="amount">${c.year1_amount ? formatCurrency(c.year1_amount) : '-'}</td>
                <td class="amount">${c.year2_amount ? formatCurrency(c.year2_amount) : '-'}</td>
                <td class="amount">${formatCurrency(c.monthly_amount)}</td>
              </tr>
            `).join('')}
          ` : ''}
          
          ${selfEmploymentIncome.length > 0 ? `
            <tr class="subtotal">
              <td colspan="4"><strong>SELF-EMPLOYMENT INCOME</strong></td>
              <td class="amount">${formatCurrency(subtotalSelfEmp)}</td>
            </tr>
            ${selfEmploymentIncome.map(c => `
              <tr>
                <td>${c.component_type.replace(/_/g, ' ').toUpperCase()}</td>
                <td class="method">${c.calculation_method || '-'}<br><em>${c.notes || ''}</em></td>
                <td class="amount">${c.year1_amount ? formatCurrency(c.year1_amount) : '-'}</td>
                <td class="amount">${c.year2_amount ? formatCurrency(c.year2_amount) : '-'}</td>
                <td class="amount">${formatCurrency(c.monthly_amount)}</td>
              </tr>
            `).join('')}
          ` : ''}
          
          ${rentalIncome.length > 0 ? `
            <tr class="subtotal">
              <td colspan="4"><strong>RENTAL INCOME (Schedule E)</strong></td>
              <td class="amount">${formatCurrency(subtotalRental)}</td>
            </tr>
            ${rentalIncome.map(c => `
              <tr>
                <td>${c.component_type.replace(/_/g, ' ').toUpperCase()}</td>
                <td class="method">${c.calculation_method || '-'}<br><em>${c.notes || ''}</em></td>
                <td class="amount">-</td>
                <td class="amount">-</td>
                <td class="amount ${c.monthly_amount < 0 ? 'trend-down' : ''}">${formatCurrency(c.monthly_amount)}</td>
              </tr>
            `).join('')}
          ` : ''}
          
          ${otherIncome.length > 0 ? `
            <tr class="subtotal">
              <td colspan="4"><strong>OTHER INCOME (K-1, etc.)</strong></td>
              <td class="amount">${formatCurrency(subtotalOther)}</td>
            </tr>
            ${otherIncome.map(c => `
              <tr>
                <td>${c.component_type.replace(/_/g, ' ').toUpperCase()}</td>
                <td class="method">${c.calculation_method || '-'}</td>
                <td class="amount">${c.year1_amount ? formatCurrency(c.year1_amount) : '-'}</td>
                <td class="amount">${c.year2_amount ? formatCurrency(c.year2_amount) : '-'}</td>
                <td class="amount">${formatCurrency(c.monthly_amount)}</td>
              </tr>
            `).join('')}
          ` : ''}
          
          <tr class="total">
            <td colspan="4"><strong>TOTAL MONTHLY QUALIFYING INCOME</strong></td>
            <td class="amount">${formatCurrency(calculation.result_monthly_income)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="section">
    <div class="section-header">DOCUMENTS REVIEWED</div>
    <div class="section-content">
      <ul class="documents-list">
        ${documents.map(doc => `
          <li>
            <strong>${(doc.doc_type || 'Document').replace(/_/g, ' ').toUpperCase()}</strong>: 
            ${doc.file_name}
            ${doc.tax_year ? `(${doc.tax_year})` : ''}
            ${doc.doc_period_start ? `- Period: ${formatDate(doc.doc_period_start)}` : ''}
            ${doc.doc_period_end ? ` to ${formatDate(doc.doc_period_end)}` : ''}
          </li>
        `).join('')}
      </ul>
    </div>
  </div>

  <div class="footer">
    <p style="font-size: 10px; color: #666; margin-bottom: 10px;">
      This worksheet is prepared for underwriting support purposes only. Final income qualification 
      is subject to applicable agency guidelines (Fannie Mae, Freddie Mac, FHA, VA, USDA) and individual 
      lender overlays. Self-employment income calculations include applicable add-backs per Fannie Mae 
      Form 1084 guidelines. Variable income trending analysis per Fannie Mae Selling Guide B3-3.1.
    </p>
    
    <div class="signature-line">
      <div>
        Loan Officer
      </div>
      <div>
        Date
      </div>
      <div>
        Signature
      </div>
    </div>
    
    <p style="font-size: 9px; color: #999; margin-top: 20px; text-align: center;">
      Generated by MortgageBolt Income Calculator | ${formatDate(new Date().toISOString())}
    </p>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { calculation_id, format = 'html' } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get calculation with borrower info
    const { data: calculation, error: calcError } = await supabaseClient
      .from('income_calculations')
      .select('*')
      .eq('id', calculation_id)
      .single();

    if (calcError || !calculation) {
      throw new Error('Calculation not found');
    }

    // Get borrower
    const { data: borrower } = await supabaseClient
      .from('borrowers')
      .select('*')
      .eq('id', calculation.borrower_id)
      .single();

    if (!borrower) {
      throw new Error('Borrower not found');
    }

    // Get income components
    const { data: components } = await supabaseClient
      .from('income_components')
      .select('*')
      .eq('calculation_id', calculation_id)
      .order('monthly_amount', { ascending: false });

    // Get documents used
    const { data: documents } = await supabaseClient
      .from('income_documents')
      .select('*')
      .eq('borrower_id', calculation.borrower_id)
      .eq('ocr_status', 'success');

    // Generate HTML content
    const htmlContent = generateForm1084HTML(
      calculation,
      components || [],
      documents || [],
      borrower
    );

    // Store the file
    const timestamp = Date.now();
    const fileName = `form-1084-${borrower.last_name.toLowerCase()}-${timestamp}.html`;
    
    const { error: uploadError } = await supabaseClient.storage
      .from('income-docs')
      .upload(`exports/${fileName}`, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Get signed URL (valid for 1 hour)
    const { data: urlData } = await supabaseClient.storage
      .from('income-docs')
      .createSignedUrl(`exports/${fileName}`, 3600);

    // Log audit event
    await supabaseClient
      .from('income_audit_events')
      .insert({
        calculation_id: calculation.id,
        step: 'export_form_1084',
        payload: {
          format: 'html',
          file_path: `exports/${fileName}`,
          components_count: components?.length || 0,
          documents_count: documents?.length || 0,
          monthly_income: calculation.result_monthly_income
        }
      });

    // Return the HTML directly for immediate display/download
    return new Response(htmlContent, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${fileName}"`
      }
    });

  } catch (error) {
    console.error('Export Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
