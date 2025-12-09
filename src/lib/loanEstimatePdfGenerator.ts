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

// Position configuration - exported so it can be used by calibration panel
export interface FieldPosition {
  x: number;
  y: number;
  rightAlign?: boolean;
  fontSize?: number;
  bold?: boolean;
}

export const DEFAULT_FIELD_POSITIONS: Record<string, FieldPosition> = {
  // Top info section - LEFT column
  borrowerName: { x: 100, y: 134 },
  lenderLoanNumber: { x: 100, y: 152 },
  zipState: { x: 100, y: 170 },
  date: { x: 100, y: 188 },
  
  // Top info section - RIGHT column (right-aligned)
  purchasePrice: { x: 555, y: 134, rightAlign: true },
  loanAmount: { x: 555, y: 152, rightAlign: true },
  rateApr: { x: 555, y: 170, rightAlign: true },
  loanTerm: { x: 555, y: 188, rightAlign: true },
  
  // Section A: Lender Fees
  sectionATotal: { x: 280, y: 224, rightAlign: true, bold: true },
  discountPoints: { x: 280, y: 248, rightAlign: true, fontSize: 9 },
  underwritingFee: { x: 280, y: 266, rightAlign: true, fontSize: 9 },
  
  // Section B: Third Party Fees
  sectionBTotal: { x: 280, y: 302, rightAlign: true, bold: true },
  appraisalFee: { x: 280, y: 336, rightAlign: true, fontSize: 9 },
  creditReportFee: { x: 280, y: 354, rightAlign: true, fontSize: 9 },
  processingFee: { x: 280, y: 372, rightAlign: true, fontSize: 9 },
  lendersTitleInsurance: { x: 280, y: 406, rightAlign: true, fontSize: 9 },
  titleClosingFee: { x: 280, y: 424, rightAlign: true, fontSize: 9 },
  
  // Section C: Taxes & Government Fees
  sectionCTotal: { x: 555, y: 224, rightAlign: true, bold: true },
  intangibleTax: { x: 555, y: 248, rightAlign: true, fontSize: 9 },
  transferTax: { x: 555, y: 266, rightAlign: true, fontSize: 9 },
  recordingFees: { x: 555, y: 284, rightAlign: true, fontSize: 9 },
  
  // Section D: Prepaids & Escrow
  sectionDTotal: { x: 555, y: 302, rightAlign: true, bold: true },
  prepaidHoi: { x: 555, y: 336, rightAlign: true, fontSize: 9 },
  prepaidInterest: { x: 555, y: 354, rightAlign: true, fontSize: 9 },
  escrowHoi: { x: 555, y: 388, rightAlign: true, fontSize: 9 },
  escrowTaxes: { x: 555, y: 406, rightAlign: true, fontSize: 9 },
  
  // Estimated Monthly Payment
  principalInterest: { x: 280, y: 470, rightAlign: true, fontSize: 9 },
  propertyTaxes: { x: 280, y: 488, rightAlign: true, fontSize: 9 },
  homeownersInsurance: { x: 280, y: 506, rightAlign: true, fontSize: 9 },
  mortgageInsurance: { x: 280, y: 524, rightAlign: true, fontSize: 9 },
  hoaDues: { x: 280, y: 542, rightAlign: true, fontSize: 9 },
  totalMonthlyPayment: { x: 280, y: 572, rightAlign: true, bold: true, fontSize: 11 },
  
  // Estimated Cash to Close
  downPayment: { x: 555, y: 470, rightAlign: true, fontSize: 9 },
  closingCosts: { x: 555, y: 488, rightAlign: true, fontSize: 9 },
  prepaidsEscrow: { x: 555, y: 506, rightAlign: true, fontSize: 9 },
  adjustmentsCredits: { x: 555, y: 524, rightAlign: true, fontSize: 9 },
  totalCashToClose: { x: 555, y: 572, rightAlign: true, bold: true, fontSize: 11 },
};

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
  shouldDownload: boolean = true,
  positionOverrides?: Partial<Record<string, FieldPosition>>
): Promise<Uint8Array> => {
  try {
    // Merge default positions with any overrides
    const positions = { ...DEFAULT_FIELD_POSITIONS, ...positionOverrides };
    
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

    // Helper to draw text based on position config
    const drawField = (fieldName: string, text: string) => {
      const pos = positions[fieldName];
      if (!pos) return;
      
      const font = pos.bold ? boldFont : regularFont;
      const size = pos.fontSize || 10;
      
      if (pos.rightAlign) {
        const textWidth = font.widthOfTextAtSize(text, size);
        page.drawText(text, { x: pos.x - textWidth, y: height - pos.y, size, font, color: black });
      } else {
        page.drawText(text, { x: pos.x, y: height - pos.y, size, font, color: black });
      }
    };

    // Top info section - LEFT column
    drawField('borrowerName', data.borrowerName || '');
    drawField('lenderLoanNumber', data.lenderLoanNumber || '');
    drawField('zipState', data.zipState || '');
    drawField('date', data.date || new Date().toLocaleDateString());

    // Top info section - RIGHT column
    drawField('purchasePrice', formatCurrency(data.purchasePrice));
    drawField('loanAmount', formatCurrency(data.loanAmount));
    drawField('rateApr', `${data.interestRate?.toFixed(3) || '0.000'}% / ${data.apr?.toFixed(3) || '0.000'}%`);
    drawField('loanTerm', `${data.loanTerm || 360} months`);

    // SECTION A: Lender Fees
    drawField('sectionATotal', formatCurrency(totals.sectionA));
    drawField('discountPoints', formatCurrency(data.discountPoints));
    drawField('underwritingFee', formatCurrency(data.underwritingFee));

    // SECTION B: Third Party Fees
    drawField('sectionBTotal', formatCurrency(totals.sectionB));
    drawField('appraisalFee', formatCurrency(data.appraisalFee));
    drawField('creditReportFee', formatCurrency(data.creditReportFee));
    drawField('processingFee', formatCurrency(data.processingFee));
    drawField('lendersTitleInsurance', formatCurrency(data.lendersTitleInsurance));
    drawField('titleClosingFee', formatCurrency(data.titleClosingFee));

    // SECTION C: Taxes & Government Fees
    drawField('sectionCTotal', formatCurrency(totals.sectionC));
    drawField('intangibleTax', formatCurrency(data.intangibleTax));
    drawField('transferTax', formatCurrency(data.transferTax));
    drawField('recordingFees', formatCurrency(data.recordingFees));

    // SECTION D: Prepaids & Escrow
    drawField('sectionDTotal', formatCurrency(totals.sectionD));
    drawField('prepaidHoi', formatCurrency(data.prepaidHoi));
    drawField('prepaidInterest', formatCurrency(data.prepaidInterest));
    drawField('escrowHoi', formatCurrency(data.escrowHoi));
    drawField('escrowTaxes', formatCurrency(data.escrowTaxes));

    // Estimated Monthly Payment
    drawField('principalInterest', formatCurrency(data.principalInterest));
    drawField('propertyTaxes', formatCurrency(data.propertyTaxes));
    drawField('homeownersInsurance', formatCurrency(data.homeownersInsurance));
    drawField('mortgageInsurance', formatCurrency(data.mortgageInsurance));
    drawField('hoaDues', formatCurrency(data.hoaDues));
    drawField('totalMonthlyPayment', formatCurrency(totals.totalMonthlyPayment));

    // Estimated Cash to Close
    drawField('downPayment', formatCurrency(data.downPayment));
    drawField('closingCosts', formatCurrency(totals.closingCosts));
    drawField('prepaidsEscrow', formatCurrency(totals.prepaidsEscrow));
    drawField('adjustmentsCredits', data.adjustmentsCredits > 0 ? `-${formatCurrency(data.adjustmentsCredits)}` : formatCurrency(0));
    drawField('totalCashToClose', formatCurrency(totals.totalCashToClose));

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
