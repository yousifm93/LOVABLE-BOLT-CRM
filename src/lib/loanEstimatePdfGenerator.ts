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
  // Top info section - LEFT column (font size 8, y-10)
  borrowerName: { x: 100, y: 124, fontSize: 8 },
  lenderLoanNumber: { x: 100, y: 142, fontSize: 8 },
  zipState: { x: 100, y: 160, fontSize: 8 },
  date: { x: 100, y: 178, fontSize: 8 },
  
  // Top info section - RIGHT column (right-aligned, font size 8, y-10)
  purchasePrice: { x: 555, y: 124, rightAlign: true, fontSize: 8 },
  loanAmount: { x: 555, y: 142, rightAlign: true, fontSize: 8 },
  rateApr: { x: 555, y: 160, rightAlign: true, fontSize: 8 },
  loanTerm: { x: 555, y: 178, rightAlign: true, fontSize: 8 },
  
  // Section A: Lender Fees (bold 9, items 7, y-10)
  sectionATotal: { x: 280, y: 214, rightAlign: true, bold: true, fontSize: 9 },
  discountPoints: { x: 280, y: 238, rightAlign: true, fontSize: 7 },
  underwritingFee: { x: 280, y: 256, rightAlign: true, fontSize: 7 },
  
  // Section B: Third Party Fees (bold 9, items 7, y-10)
  sectionBTotal: { x: 280, y: 292, rightAlign: true, bold: true, fontSize: 9 },
  appraisalFee: { x: 280, y: 326, rightAlign: true, fontSize: 7 },
  creditReportFee: { x: 280, y: 344, rightAlign: true, fontSize: 7 },
  processingFee: { x: 280, y: 362, rightAlign: true, fontSize: 7 },
  lendersTitleInsurance: { x: 280, y: 396, rightAlign: true, fontSize: 7 },
  titleClosingFee: { x: 280, y: 414, rightAlign: true, fontSize: 7 },
  
  // Section C: Taxes & Government Fees (bold 9, items 7, y-10)
  sectionCTotal: { x: 555, y: 214, rightAlign: true, bold: true, fontSize: 9 },
  intangibleTax: { x: 555, y: 238, rightAlign: true, fontSize: 7 },
  transferTax: { x: 555, y: 256, rightAlign: true, fontSize: 7 },
  recordingFees: { x: 555, y: 274, rightAlign: true, fontSize: 7 },
  
  // Section D: Prepaids & Escrow (bold 9, items 7, y-10)
  sectionDTotal: { x: 555, y: 292, rightAlign: true, bold: true, fontSize: 9 },
  prepaidHoi: { x: 555, y: 326, rightAlign: true, fontSize: 7 },
  prepaidInterest: { x: 555, y: 344, rightAlign: true, fontSize: 7 },
  escrowHoi: { x: 555, y: 378, rightAlign: true, fontSize: 7 },
  escrowTaxes: { x: 555, y: 396, rightAlign: true, fontSize: 7 },
  
  // Estimated Monthly Payment (items 7, bold 9, y-10)
  principalInterest: { x: 280, y: 460, rightAlign: true, fontSize: 7 },
  propertyTaxes: { x: 280, y: 478, rightAlign: true, fontSize: 7 },
  homeownersInsurance: { x: 280, y: 496, rightAlign: true, fontSize: 7 },
  mortgageInsurance: { x: 280, y: 514, rightAlign: true, fontSize: 7 },
  hoaDues: { x: 280, y: 532, rightAlign: true, fontSize: 7 },
  totalMonthlyPayment: { x: 280, y: 562, rightAlign: true, bold: true, fontSize: 9 },
  
  // Estimated Cash to Close (items 7, bold 9, y-10)
  downPayment: { x: 555, y: 460, rightAlign: true, fontSize: 7 },
  closingCosts: { x: 555, y: 478, rightAlign: true, fontSize: 7 },
  prepaidsEscrow: { x: 555, y: 496, rightAlign: true, fontSize: 7 },
  adjustmentsCredits: { x: 555, y: 514, rightAlign: true, fontSize: 7 },
  totalCashToClose: { x: 555, y: 562, rightAlign: true, bold: true, fontSize: 9 },
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
