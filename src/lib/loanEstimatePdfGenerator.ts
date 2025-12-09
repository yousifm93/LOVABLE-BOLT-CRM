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

    // Embed fonts
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Colors
    const black = rgb(0, 0, 0);
    const darkGray = rgb(0.3, 0.3, 0.3);
    const yellow = rgb(0.98, 0.78, 0.05); // Gold/Yellow for ESTIMATE
    const lightGray = rgb(0.95, 0.95, 0.95);

    // Try to load template image
    let useTemplate = false;
    try {
      const { data: templateData, error } = await supabase.storage
        .from('pdf-templates')
        .download('bolt-estimate-template.png');

      if (!error && templateData) {
        const imageBytes = await templateData.arrayBuffer();
        const templateImg = await pdfDoc.embedPng(imageBytes);
        page.drawImage(templateImg, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
        useTemplate = true;
      }
    } catch (error) {
      console.log('Template not found, generating from scratch');
    }

    // If no template, draw the layout
    if (!useTemplate) {
      // Header - BOLT ESTIMATE
      page.drawText('BOLT', { x: 50, y: height - 60, size: 36, font: boldFont, color: black });
      page.drawText('ESTIMATE', { x: 132, y: height - 60, size: 36, font: regularFont, color: yellow });
      
      // Disclaimer
      page.drawText('Your actual rate, payment and costs could be higher. Get an official Loan Estimate before choosing a loan.', {
        x: 50, y: height - 80, size: 8, font: italicFont, color: darkGray
      });

      // Draw section boxes
      const drawBox = (x: number, y: number, w: number, h: number) => {
        page.drawRectangle({ x, y: height - y - h, width: w, height: h, borderColor: darkGray, borderWidth: 1 });
      };

      // Top info box
      drawBox(50, 95, 512, 70);
      
      // Section A & C
      drawBox(50, 175, 250, 80);
      drawBox(312, 175, 250, 80);
      
      // Section B & D
      drawBox(50, 265, 250, 120);
      drawBox(312, 265, 250, 120);
      
      // Monthly Payment & Cash to Close
      drawBox(50, 395, 250, 130);
      drawBox(312, 395, 250, 130);
    }

    // Calculate totals
    const totals = calculateTotals(data);

    // Position configurations for overlaying data
    const positions = {
      // Top info section (left column)
      borrowerName: { x: 115, y: height - 115, size: 10 },
      loanNumber: { x: 115, y: height - 130, size: 10 },
      zipState: { x: 115, y: height - 145, size: 10 },
      date: { x: 115, y: height - 160, size: 10 },
      
      // Top info section (right column)
      purchasePrice: { x: 450, y: height - 115, size: 10 },
      loanAmount: { x: 450, y: height - 130, size: 10 },
      rateApr: { x: 450, y: height - 145, size: 10 },
      loanTerm: { x: 450, y: height - 160, size: 10 },

      // Section A: Lender Fees
      sectionATotal: { x: 250, y: height - 190, size: 10 },
      discountPoints: { x: 250, y: height - 210, size: 9 },
      underwritingFee: { x: 250, y: height - 225, size: 9 },

      // Section B: Third Party Fees
      sectionBTotal: { x: 250, y: height - 280, size: 10 },
      appraisalFee: { x: 250, y: height - 310, size: 9 },
      creditReportFee: { x: 250, y: height - 325, size: 9 },
      processingFee: { x: 250, y: height - 340, size: 9 },
      lendersTitleInsurance: { x: 250, y: height - 365, size: 9 },
      titleClosingFee: { x: 250, y: height - 380, size: 9 },

      // Section C: Taxes & Government Fees
      sectionCTotal: { x: 512, y: height - 190, size: 10 },
      intangibleTax: { x: 512, y: height - 210, size: 9 },
      transferTax: { x: 512, y: height - 225, size: 9 },
      recordingFees: { x: 512, y: height - 240, size: 9 },

      // Section D: Prepaids & Escrow
      sectionDTotal: { x: 512, y: height - 280, size: 10 },
      prepaidHoi: { x: 512, y: height - 310, size: 9 },
      prepaidInterest: { x: 512, y: height - 325, size: 9 },
      escrowHoi: { x: 512, y: height - 355, size: 9 },
      escrowTaxes: { x: 512, y: height - 370, size: 9 },

      // Monthly Payment
      principalInterest: { x: 250, y: height - 420, size: 9 },
      propertyTaxes: { x: 250, y: height - 435, size: 9 },
      homeownersInsurance: { x: 250, y: height - 450, size: 9 },
      mortgageInsurance: { x: 250, y: height - 465, size: 9 },
      hoaDues: { x: 250, y: height - 480, size: 9 },
      totalMonthlyPayment: { x: 250, y: height - 510, size: 11 },

      // Cash to Close
      downPayment: { x: 512, y: height - 420, size: 9 },
      closingCosts: { x: 512, y: height - 435, size: 9 },
      prepaidsEscrow: { x: 512, y: height - 450, size: 9 },
      adjustmentsCredits: { x: 512, y: height - 465, size: 9 },
      totalCashToClose: { x: 512, y: height - 510, size: 11 },
    };

    // Helper to draw right-aligned text
    const drawRightAligned = (text: string, x: number, y: number, size: number, font = regularFont) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: x - textWidth, y, size, font, color: black });
    };

    // Draw all the data
    // Top info - left column
    page.drawText(data.borrowerName || '', { ...positions.borrowerName, font: regularFont, color: black });
    page.drawText(data.lenderLoanNumber || '', { ...positions.loanNumber, font: regularFont, color: black });
    page.drawText(data.zipState || '', { ...positions.zipState, font: regularFont, color: black });
    page.drawText(data.date || new Date().toLocaleDateString(), { ...positions.date, font: regularFont, color: black });

    // Top info - right column (right aligned)
    drawRightAligned(formatCurrency(data.purchasePrice), positions.purchasePrice.x, positions.purchasePrice.y, positions.purchasePrice.size);
    drawRightAligned(formatCurrency(data.loanAmount), positions.loanAmount.x, positions.loanAmount.y, positions.loanAmount.size);
    drawRightAligned(`${data.interestRate?.toFixed(3) || '0.000'}% / ${data.apr?.toFixed(3) || '0.000'}%`, positions.rateApr.x, positions.rateApr.y, positions.rateApr.size);
    drawRightAligned(`${data.loanTerm || 360} months`, positions.loanTerm.x, positions.loanTerm.y, positions.loanTerm.size);

    // Section A
    drawRightAligned(formatCurrency(totals.sectionA), positions.sectionATotal.x, positions.sectionATotal.y, positions.sectionATotal.size, boldFont);
    drawRightAligned(formatCurrency(data.discountPoints), positions.discountPoints.x, positions.discountPoints.y, positions.discountPoints.size);
    drawRightAligned(formatCurrency(data.underwritingFee), positions.underwritingFee.x, positions.underwritingFee.y, positions.underwritingFee.size);

    // Section B
    drawRightAligned(formatCurrency(totals.sectionB), positions.sectionBTotal.x, positions.sectionBTotal.y, positions.sectionBTotal.size, boldFont);
    drawRightAligned(formatCurrency(data.appraisalFee), positions.appraisalFee.x, positions.appraisalFee.y, positions.appraisalFee.size);
    drawRightAligned(formatCurrency(data.creditReportFee), positions.creditReportFee.x, positions.creditReportFee.y, positions.creditReportFee.size);
    drawRightAligned(formatCurrency(data.processingFee), positions.processingFee.x, positions.processingFee.y, positions.processingFee.size);
    drawRightAligned(formatCurrency(data.lendersTitleInsurance), positions.lendersTitleInsurance.x, positions.lendersTitleInsurance.y, positions.lendersTitleInsurance.size);
    drawRightAligned(formatCurrency(data.titleClosingFee), positions.titleClosingFee.x, positions.titleClosingFee.y, positions.titleClosingFee.size);

    // Section C
    drawRightAligned(formatCurrency(totals.sectionC), positions.sectionCTotal.x, positions.sectionCTotal.y, positions.sectionCTotal.size, boldFont);
    drawRightAligned(formatCurrency(data.intangibleTax), positions.intangibleTax.x, positions.intangibleTax.y, positions.intangibleTax.size);
    drawRightAligned(formatCurrency(data.transferTax), positions.transferTax.x, positions.transferTax.y, positions.transferTax.size);
    drawRightAligned(formatCurrency(data.recordingFees), positions.recordingFees.x, positions.recordingFees.y, positions.recordingFees.size);

    // Section D
    drawRightAligned(formatCurrency(totals.sectionD), positions.sectionDTotal.x, positions.sectionDTotal.y, positions.sectionDTotal.size, boldFont);
    drawRightAligned(formatCurrency(data.prepaidHoi), positions.prepaidHoi.x, positions.prepaidHoi.y, positions.prepaidHoi.size);
    drawRightAligned(formatCurrency(data.prepaidInterest), positions.prepaidInterest.x, positions.prepaidInterest.y, positions.prepaidInterest.size);
    drawRightAligned(formatCurrency(data.escrowHoi), positions.escrowHoi.x, positions.escrowHoi.y, positions.escrowHoi.size);
    drawRightAligned(formatCurrency(data.escrowTaxes), positions.escrowTaxes.x, positions.escrowTaxes.y, positions.escrowTaxes.size);

    // Monthly Payment
    drawRightAligned(formatCurrency(data.principalInterest), positions.principalInterest.x, positions.principalInterest.y, positions.principalInterest.size);
    drawRightAligned(formatCurrency(data.propertyTaxes), positions.propertyTaxes.x, positions.propertyTaxes.y, positions.propertyTaxes.size);
    drawRightAligned(formatCurrency(data.homeownersInsurance), positions.homeownersInsurance.x, positions.homeownersInsurance.y, positions.homeownersInsurance.size);
    drawRightAligned(formatCurrency(data.mortgageInsurance), positions.mortgageInsurance.x, positions.mortgageInsurance.y, positions.mortgageInsurance.size);
    drawRightAligned(formatCurrency(data.hoaDues), positions.hoaDues.x, positions.hoaDues.y, positions.hoaDues.size);
    drawRightAligned(formatCurrency(totals.totalMonthlyPayment), positions.totalMonthlyPayment.x, positions.totalMonthlyPayment.y, positions.totalMonthlyPayment.size, boldFont);

    // Cash to Close
    drawRightAligned(formatCurrency(data.downPayment), positions.downPayment.x, positions.downPayment.y, positions.downPayment.size);
    drawRightAligned(formatCurrency(totals.closingCosts), positions.closingCosts.x, positions.closingCosts.y, positions.closingCosts.size);
    drawRightAligned(formatCurrency(totals.prepaidsEscrow), positions.prepaidsEscrow.x, positions.prepaidsEscrow.y, positions.prepaidsEscrow.size);
    drawRightAligned(formatCurrency(data.adjustmentsCredits), positions.adjustmentsCredits.x, positions.adjustmentsCredits.y, positions.adjustmentsCredits.size);
    drawRightAligned(formatCurrency(totals.totalCashToClose), positions.totalCashToClose.x, positions.totalCashToClose.y, positions.totalCashToClose.size, boldFont);

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
