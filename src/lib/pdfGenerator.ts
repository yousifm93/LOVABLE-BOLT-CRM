import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { supabase } from '@/integrations/supabase/client';

export interface PreApprovalData {
  fullName: string;
  propertyAddress: string;
  loanType: string;
  salesPrice: string;
  loanAmount: string;
}

export const generatePreApprovalPDF = async (data: PreApprovalData, shouldDownload: boolean = false): Promise<Uint8Array> => {
  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();

    // Embed fonts for overlaying data
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    const black = rgb(0, 0, 0);

    // Template field positioning configuration - easily adjustable coordinates
    const templateFieldPositions = {
      borrowerName: { x: 158, y: height - 314, size: 16.5, font: boldFont, color: black },
      dateIssued: { x: 86, y: height - 278, size: 11, font: regularFont, color: black },
      expirationDate: { x: 358, y: height - 447, size: 9, font: italicFont, color: black },
      propertyAddress: { x: 74, y: height - 471, size: 11.5, font: regularFont, color: black },
      loanType: { x: 97, y: height - 499, size: 12, font: boldFont, color: black },
      loanAmount: { x: 97, y: height - 533, size: 12, font: boldFont, color: black },
      purchasePrice: { x: 97, y: height - 565, size: 12, font: boldFont, color: black },
    };

    // Load the uploaded template by downloading it directly
    let useTemplate = false;
    try {
      console.log('Loading uploaded template: canva sans font.jpg');

      // Try downloading the file directly with proper error handling
      const { data: templateData, error } = await supabase.storage
        .from('pdf-templates')
        .download('canva sans font.jpg');

      console.log('Download result:', { templateData: !!templateData, error });

      if (error) {
        console.error('Supabase storage error:', error);
        throw new Error(`Storage error: ${error.message}`);
      }

      if (templateData) {
        const imageBytes = await templateData.arrayBuffer();
        console.log('Image bytes length:', imageBytes.byteLength);

        let templateImg;
        try {
          templateImg = await pdfDoc.embedJpg(imageBytes);
        } catch (jpgError) {
          console.log('JPG embed failed, trying PNG:', jpgError);
          templateImg = await pdfDoc.embedPng(imageBytes);
        }

        // Draw the uploaded template as background
        page.drawImage(templateImg, {
          x: 0,
          y: 0,
          width: width,
          height: height,
        });
        useTemplate = true;
        console.log('Successfully loaded uploaded template: canva sans font');
      } else {
        throw new Error('No template data received');
      }
    } catch (error) {
      console.error('Error loading uploaded template:', error);
      throw new Error(`Could not load uploaded template: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Current date
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    // Overlay data on the uploaded template using configurable positions

    // Borrower Name (full name from form)
    page.drawText(data.fullName + "!", templateFieldPositions.borrowerName);

    // Date issued
    page.drawText(currentDate, templateFieldPositions.dateIssued);

    // Expiration date (60 days from today)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 60);
    const expDateString = expirationDate.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    page.drawText(expDateString, templateFieldPositions.expirationDate);

    // Property Address
    page.drawText(data.propertyAddress, templateFieldPositions.propertyAddress);

    // Loan Type
    page.drawText(data.loanType, templateFieldPositions.loanType);

    // Loan Amount
    page.drawText(data.loanAmount, templateFieldPositions.loanAmount);

    // Purchase Price
    page.drawText(data.salesPrice, templateFieldPositions.purchasePrice);

    // Generate PDF bytes with maximum compression settings
    const pdfBytes = await pdfDoc.save({
      objectsPerTick: 1,
      updateFieldAppearances: false,
    });

    // Only download if requested (for admin use)
    if (shouldDownload) {
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

      // Extract first and last initials
      const nameParts = data.fullName.trim().split(' ');
      const firstInitial = nameParts[0]?.charAt(0).toUpperCase() || '';
      const lastInitial = nameParts[nameParts.length - 1]?.charAt(0).toUpperCase() || '';

      // Format date as M.D.YY
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const year = today.getFullYear().toString().slice(-2);
      const dateStr = `${month}.${day}.${year}`;

      const filename = `Pre-Approval Letter - ${firstInitial}${lastInitial} ${dateStr}.pdf`;
      saveAs(blob, filename);
    }

    // Return PDF bytes for email functionality
    return pdfBytes;

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};
