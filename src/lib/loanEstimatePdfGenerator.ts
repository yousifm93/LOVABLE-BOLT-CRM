import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

export interface LoanEstimateData {
  // Borrower Info
  borrowerName: string;
  lenderLoanNumber: string;
  zipState: string;
  date: string;
  purchasePrice: number;
  loanAmount: number;
  interestRate: number;
  apr: number;
  loanTerm: number; // in months
  
  // Section A: Lender Fees
  discountPoints: number;
  underwritingFee: number;
  
  // Section B: Third Party Fees - Services You Cannot Shop For
  appraisalFee: number;
  creditReportFee: number;
  processingFee: number;
  
  // Section B: Third Party Fees - Services You Can Shop For
  lendersTitleInsurance: number;
  titleClosingFee: number;
  
  // Section C: Taxes and Other Government Fees
  intangibleTax: number;
  transferTax: number;
  recordingFees: number;
  
  // Section D: Prepaids and Initial Escrow at Closing
  prepaidHoi: number;
  prepaidInterest: number;
  escrowHoi: number;
  escrowTaxes: number;
  
  // Monthly Payment Components
  principalInterest: number;
  propertyTaxes: number;
  homeownersInsurance: number;
  mortgageInsurance: number;
  hoaDues: number;
  
  // Cash to Close
  downPayment: number;
  adjustmentsCredits: number;
}

// Calculate totals
export const calculateTotals = (data: LoanEstimateData) => {
  const sectionA = (data.discountPoints || 0) + (data.underwritingFee || 0);
  const sectionB = (data.appraisalFee || 0) + (data.creditReportFee || 0) + 
                   (data.processingFee || 0) + (data.lendersTitleInsurance || 0) + 
                   (data.titleClosingFee || 0);
  const sectionC = (data.intangibleTax || 0) + (data.transferTax || 0) + (data.recordingFees || 0);
  const sectionD = (data.prepaidHoi || 0) + (data.prepaidInterest || 0) + 
                   (data.escrowHoi || 0) + (data.escrowTaxes || 0);
  
  const closingCosts = sectionA + sectionB + sectionC;
  const prepaidsEscrow = sectionD;
  
  const totalMonthlyPayment = (data.principalInterest || 0) + (data.propertyTaxes || 0) + 
                              (data.homeownersInsurance || 0) + (data.mortgageInsurance || 0) + 
                              (data.hoaDues || 0);
  
  const totalCashToClose = (data.downPayment || 0) + closingCosts + prepaidsEscrow - 
                           (data.adjustmentsCredits || 0);
  
  return {
    sectionA,
    sectionB,
    sectionC,
    sectionD,
    closingCosts,
    prepaidsEscrow,
    totalMonthlyPayment,
    totalCashToClose
  };
};

// Format currency
const formatCurrency = (value: number): string => {
  if (value === 0 || isNaN(value)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export const generateLoanEstimatePDF = async (
  data: LoanEstimateData, 
  shouldDownload: boolean = true
): Promise<Uint8Array> => {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();

    // Download the PNG template from Supabase
    const { data: templateData, error } = await supabase.storage
      .from('pdf-templates')
      .download('Copy of Copy of LE - FORMATTED FOR AUTOMATION (8.5 x 11 in).png');

    if (error || !templateData) {
      console.error('Failed to load PNG template:', error);
      throw new Error('PNG template not found in storage');
    }

    // Embed the PNG as page background
    const imageBytes = await templateData.arrayBuffer();
    const templateImg = await pdfDoc.embedPng(imageBytes);

    // Draw template as full-page background
    page.drawImage(templateImg, {
      x: 0,
      y: 0,
      width: width,
      height: height,
    });

    // Embed fonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const black = rgb(0, 0, 0);

    // Calculate totals
    const totals = calculateTotals(data);

    // Helper to draw right-aligned text
    const drawRightAligned = (text: string, x: number, y: number, size: number, font = regularFont) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: x - textWidth, y, size, font, color: black });
    };

    // Position configurations calibrated for the Bolt Estimate template
    // PDF coordinates: y=0 is bottom, y=792 is top for letter size
    
    // Top info section - LEFT column (labels are pre-printed, we just add values)
    // Borrower row
    page.drawText(data.borrowerName || '', { 
      x: 100, y: height - 134, size: 10, font: regularFont, color: black 
    });
    
    // Loan Number row
    page.drawText(data.lenderLoanNumber || '', { 
      x: 100, y: height - 152, size: 10, font: regularFont, color: black 
    });
    
    // Zip & State row
    page.drawText(data.zipState || '', { 
      x: 100, y: height - 170, size: 10, font: regularFont, color: black 
    });
    
    // Date row
    page.drawText(data.date || new Date().toLocaleDateString(), { 
      x: 100, y: height - 188, size: 10, font: regularFont, color: black 
    });

    // Top info section - RIGHT column (right-aligned values)
    // Purchase Price
    drawRightAligned(formatCurrency(data.purchasePrice), 555, height - 134, 10);
    
    // Loan Amount
    drawRightAligned(formatCurrency(data.loanAmount), 555, height - 152, 10);
    
    // Rate / APR
    drawRightAligned(`${data.interestRate?.toFixed(3) || '0.000'}% / ${data.apr?.toFixed(3) || '0.000'}%`, 555, height - 170, 10);
    
    // Loan Term
    drawRightAligned(`${data.loanTerm || 360} months`, 555, height - 188, 10);

    // SECTION A: Lender Fees (left box, below header)
    // Section A Total (right side of header bar)
    drawRightAligned(formatCurrency(totals.sectionA), 280, height - 224, 10, boldFont);
    
    // Discount Points
    drawRightAligned(formatCurrency(data.discountPoints), 280, height - 248, 9);
    
    // Underwriting Fee
    drawRightAligned(formatCurrency(data.underwritingFee), 280, height - 266, 9);

    // SECTION B: Third Party Fees (left box, below Section A)
    // Section B Total
    drawRightAligned(formatCurrency(totals.sectionB), 280, height - 302, 10, boldFont);
    
    // Services You Cannot Shop For
    // Appraisal
    drawRightAligned(formatCurrency(data.appraisalFee), 280, height - 336, 9);
    
    // Credit Report
    drawRightAligned(formatCurrency(data.creditReportFee), 280, height - 354, 9);
    
    // Processing Fee
    drawRightAligned(formatCurrency(data.processingFee), 280, height - 372, 9);
    
    // Services You Can Shop For
    // Lender's Title Insurance
    drawRightAligned(formatCurrency(data.lendersTitleInsurance), 280, height - 406, 9);
    
    // Title/Closing Fee
    drawRightAligned(formatCurrency(data.titleClosingFee), 280, height - 424, 9);

    // SECTION C: Taxes & Government Fees (right box, top)
    // Section C Total
    drawRightAligned(formatCurrency(totals.sectionC), 555, height - 224, 10, boldFont);
    
    // Intangible Tax
    drawRightAligned(formatCurrency(data.intangibleTax), 555, height - 248, 9);
    
    // Transfer Tax
    drawRightAligned(formatCurrency(data.transferTax), 555, height - 266, 9);
    
    // Recording Fees
    drawRightAligned(formatCurrency(data.recordingFees), 555, height - 284, 9);

    // SECTION D: Prepaids & Escrow (right box, below Section C)
    // Section D Total
    drawRightAligned(formatCurrency(totals.sectionD), 555, height - 302, 10, boldFont);
    
    // Prepaids
    // Prepaid Homeowners Insurance
    drawRightAligned(formatCurrency(data.prepaidHoi), 555, height - 336, 9);
    
    // Prepaid Interest
    drawRightAligned(formatCurrency(data.prepaidInterest), 555, height - 354, 9);
    
    // Initial Escrow at Closing
    // Homeowners Insurance (Escrow)
    drawRightAligned(formatCurrency(data.escrowHoi), 555, height - 388, 9);
    
    // Property Taxes (Escrow)
    drawRightAligned(formatCurrency(data.escrowTaxes), 555, height - 406, 9);

    // ESTIMATED MONTHLY PAYMENT (bottom left box)
    // Principal & Interest
    drawRightAligned(formatCurrency(data.principalInterest), 280, height - 470, 9);
    
    // Taxes (Property Taxes)
    drawRightAligned(formatCurrency(data.propertyTaxes), 280, height - 488, 9);
    
    // Insurance (Homeowners)
    drawRightAligned(formatCurrency(data.homeownersInsurance), 280, height - 506, 9);
    
    // Mortgage Insurance
    drawRightAligned(formatCurrency(data.mortgageInsurance), 280, height - 524, 9);
    
    // HOA Dues
    drawRightAligned(formatCurrency(data.hoaDues), 280, height - 542, 9);
    
    // Total Monthly Payment
    drawRightAligned(formatCurrency(totals.totalMonthlyPayment), 280, height - 572, 11, boldFont);

    // ESTIMATED CASH TO CLOSE (bottom right box)
    // Down Payment
    drawRightAligned(formatCurrency(data.downPayment), 555, height - 470, 9);
    
    // Closing Costs (A + B + C)
    drawRightAligned(formatCurrency(totals.closingCosts), 555, height - 488, 9);
    
    // Prepaids & Escrow (D)
    drawRightAligned(formatCurrency(totals.prepaidsEscrow), 555, height - 506, 9);
    
    // Adjustments & Other Credits
    drawRightAligned(data.adjustmentsCredits > 0 ? `-${formatCurrency(data.adjustmentsCredits)}` : formatCurrency(0), 555, height - 524, 9);
    
    // Total Estimated Cash to Close
    drawRightAligned(formatCurrency(totals.totalCashToClose), 555, height - 572, 11, boldFont);

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Download if requested
    if (shouldDownload) {
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      
      // Extract initials for filename
      const nameParts = (data.borrowerName || 'Unknown').trim().split(' ');
      const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || '';
      const lastInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase() || '';

      // Format date
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const year = today.getFullYear().toString().slice(-2);
      const dateStr = `${month}.${day}.${year}`;

      const filename = `Bolt Estimate - ${firstInitial}${lastInitial} ${dateStr}.pdf`;
      saveAs(blob, filename);
    }

    return pdfBytes;
  } catch (error) {
    console.error('Error generating Loan Estimate PDF:', error);
    throw new Error('Failed to generate Loan Estimate PDF');
  }
};
