import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export interface MortgageApplicationData {
  personalInfo: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    dateOfBirth?: string;
    ssn?: string;
    maritalStatus?: string;
    residencyType?: string;
    militaryVeteran?: boolean;
    currentAddress?: {
      street?: string;
      unit?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    yearsAtCurrentAddress?: number | string;
    monthsAtCurrentAddress?: number | string;
    creditScore?: string;
  };
  mortgageInfo: {
    purchasePrice?: number | string;
    downPayment?: number | string;
    propertyType?: string;
    occupancy?: string;
    loanProgram?: string;
    location?: {
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
    comfortableMonthlyPayment?: number | string;
  };
  coBorrowers?: {
    coBorrowers?: Array<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      relationship?: string;
    }>;
  };
  income?: {
    employmentIncomes?: Array<{
      employerName?: string;
      jobTitle?: string;
      monthlyIncome?: string;
      yearsEmployed?: number;
    }>;
    otherIncomes?: Array<{
      source?: string;
      amount?: string;
    }>;
  };
  assets?: {
    hasNoAssets?: boolean;
    assets?: Array<{
      accountType?: string;
      institution?: string;
      balance?: string | number;
    }>;
    bankAccounts?: Array<{
      institution?: string;
      accountType?: string;
      balance?: string;
    }>;
    totalAssets?: number;
  };
  realEstate?: {
    properties?: Array<{
      address?: string;
      propertyType?: string;
      propertyUsage?: string;
      propertyValue?: string;
      monthlyRent?: string;
      monthlyExpenses?: string;
    }>;
  };
  declarations?: Array<{
    id: string;
    answer?: boolean;
  }>;
  loanPurpose?: string;
}

const formatCurrency = (amount: number | string | null | undefined): string => {
  if (!amount) return '$0';
  const cleanAmount = typeof amount === 'string' ? amount.replace(/,/g, '') : amount.toString();
  const numAmount = parseFloat(cleanAmount);
  if (isNaN(numAmount)) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

const formatAddress = (address: any): string => {
  if (!address) return 'N/A';
  const parts = [
    address.street,
    address.unit,
    address.city,
    address.state,
    address.zipCode
  ].filter(Boolean);
  return parts.join(', ') || 'N/A';
};

export const generateApplicationPdf = async (data: MortgageApplicationData): Promise<Uint8Array> => {
  const pdfDoc = await PDFDocument.create();
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const black = rgb(0, 0, 0);
  const gray = rgb(0.4, 0.4, 0.4);
  const headerBg = rgb(0.1, 0.3, 0.5);
  const white = rgb(1, 1, 1);
  
  let page = pdfDoc.addPage([612, 792]);
  let { width, height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const lineHeight = 14;
  const sectionSpacing = 20;

  const addNewPage = () => {
    page = pdfDoc.addPage([612, 792]);
    y = height - 50;
    return page;
  };

  const drawSectionHeader = (title: string) => {
    if (y < 80) addNewPage();
    y -= sectionSpacing;
    
    // Draw header background
    page.drawRectangle({
      x: margin - 5,
      y: y - 5,
      width: width - (margin * 2) + 10,
      height: 20,
      color: headerBg,
    });
    
    page.drawText(title, {
      x: margin,
      y: y,
      size: 11,
      font: boldFont,
      color: white,
    });
    
    y -= sectionSpacing;
  };

  const drawField = (label: string, value: string | undefined | null) => {
    if (y < 60) addNewPage();
    
    page.drawText(`${label}:`, {
      x: margin,
      y: y,
      size: 9,
      font: boldFont,
      color: gray,
    });
    
    page.drawText(value || 'N/A', {
      x: margin + 150,
      y: y,
      size: 9,
      font: regularFont,
      color: black,
    });
    
    y -= lineHeight;
  };

  const drawTwoColumn = (label1: string, value1: string | undefined | null, label2: string, value2: string | undefined | null) => {
    if (y < 60) addNewPage();
    
    // Left column
    page.drawText(`${label1}:`, {
      x: margin,
      y: y,
      size: 9,
      font: boldFont,
      color: gray,
    });
    
    page.drawText(value1 || 'N/A', {
      x: margin + 100,
      y: y,
      size: 9,
      font: regularFont,
      color: black,
    });
    
    // Right column
    page.drawText(`${label2}:`, {
      x: width / 2 + 20,
      y: y,
      size: 9,
      font: boldFont,
      color: gray,
    });
    
    page.drawText(value2 || 'N/A', {
      x: width / 2 + 120,
      y: y,
      size: 9,
      font: regularFont,
      color: black,
    });
    
    y -= lineHeight;
  };

  // Title
  page.drawText('MORTGAGE APPLICATION', {
    x: width / 2 - 80,
    y: y,
    size: 18,
    font: boldFont,
    color: black,
  });
  y -= 10;
  
  page.drawText(`Generated: ${new Date().toLocaleDateString('en-US')}`, {
    x: width / 2 - 50,
    y: y,
    size: 9,
    font: regularFont,
    color: gray,
  });
  y -= sectionSpacing;

  // Personal Information
  drawSectionHeader('PERSONAL INFORMATION');
  
  const pi = data.personalInfo || {};
  const fullName = [pi.firstName, pi.middleName, pi.lastName].filter(Boolean).join(' ');
  
  drawTwoColumn('Full Name', fullName, 'Email', pi.email);
  drawTwoColumn('Phone', pi.phone, 'Date of Birth', pi.dateOfBirth);
  drawTwoColumn('SSN', pi.ssn ? `***-**-${pi.ssn.slice(-4)}` : undefined, 'Credit Score', pi.creditScore);
  drawTwoColumn('Marital Status', pi.maritalStatus, 'Residency Type', pi.residencyType);
  drawField('Current Address', formatAddress(pi.currentAddress));
  
  const timeAtAddress = [
    pi.yearsAtCurrentAddress ? `${pi.yearsAtCurrentAddress} years` : null,
    pi.monthsAtCurrentAddress ? `${pi.monthsAtCurrentAddress} months` : null
  ].filter(Boolean).join(', ');
  
  drawTwoColumn('Time at Address', timeAtAddress || undefined, 'Military Veteran', pi.militaryVeteran ? 'Yes' : 'No');

  // Mortgage Information
  drawSectionHeader('MORTGAGE INFORMATION');
  
  const mi = data.mortgageInfo || {};
  const purchasePrice = typeof mi.purchasePrice === 'string' ? parseFloat(mi.purchasePrice.replace(/,/g, '')) || 0 : (mi.purchasePrice || 0);
  const downPayment = typeof mi.downPayment === 'string' ? parseFloat(mi.downPayment.replace(/,/g, '')) || 0 : (mi.downPayment || 0);
  const loanAmount = purchasePrice - downPayment;
  
  drawTwoColumn('Loan Purpose', data.loanPurpose, 'Property Type', mi.propertyType);
  drawTwoColumn('Purchase Price', formatCurrency(mi.purchasePrice), 'Down Payment', formatCurrency(mi.downPayment));
  drawTwoColumn('Loan Amount', formatCurrency(loanAmount), 'Occupancy', mi.occupancy);
  drawTwoColumn('Loan Program', mi.loanProgram, 'Monthly Payment Goal', formatCurrency(mi.comfortableMonthlyPayment));
  
  if (mi.location) {
    drawField('Subject Property', formatAddress(mi.location));
  }

  // Co-Borrowers
  const coBorrowers = data.coBorrowers?.coBorrowers || [];
  if (coBorrowers.length > 0) {
    drawSectionHeader('CO-BORROWERS');
    
    coBorrowers.forEach((cb, index) => {
      const cbName = [cb.firstName, cb.lastName].filter(Boolean).join(' ');
      drawTwoColumn(`Co-Borrower ${index + 1}`, cbName, 'Relationship', cb.relationship);
      drawTwoColumn('Email', cb.email, 'Phone', cb.phone);
      y -= 5; // Extra spacing between co-borrowers
    });
  }

  // Employment & Income
  drawSectionHeader('EMPLOYMENT & INCOME');
  
  const employmentIncomes = data.income?.employmentIncomes || [];
  if (employmentIncomes.length > 0) {
    employmentIncomes.forEach((emp, index) => {
      drawTwoColumn(`Employer ${index + 1}`, emp.employerName, 'Job Title', emp.jobTitle);
      drawTwoColumn('Monthly Income', formatCurrency(emp.monthlyIncome), 'Years Employed', emp.yearsEmployed?.toString());
      y -= 5;
    });
  }
  
  const otherIncomes = data.income?.otherIncomes || [];
  if (otherIncomes.length > 0) {
    otherIncomes.forEach((inc, index) => {
      drawTwoColumn(`Other Income ${index + 1}`, inc.source, 'Amount', formatCurrency(inc.amount));
    });
  }
  
  // Calculate total income
  const totalEmploymentIncome = employmentIncomes.reduce((sum, emp) => {
    const income = parseFloat((emp.monthlyIncome || '0').replace(/,/g, ''));
    return sum + income;
  }, 0);
  const totalOtherIncome = otherIncomes.reduce((sum, inc) => {
    const income = parseFloat((inc.amount || '0').replace(/,/g, ''));
    return sum + income;
  }, 0);
  
  y -= 5;
  drawField('Total Monthly Income', formatCurrency(totalEmploymentIncome + totalOtherIncome));

  // Assets
  drawSectionHeader('ASSETS');
  
  // Support both formats: assets.assets (from app) and assets.bankAccounts
  const assetAccounts = data.assets?.assets || data.assets?.bankAccounts || [];
  if (assetAccounts.length > 0) {
    assetAccounts.forEach((acct, index) => {
      drawTwoColumn(`Account ${index + 1}`, `${acct.institution || 'Unknown'} (${acct.accountType || 'Account'})`, 'Balance', formatCurrency(acct.balance));
    });
    
    const totalAssets = data.assets?.totalAssets || assetAccounts.reduce((sum, acct) => {
      const balanceStr = typeof acct.balance === 'string' ? acct.balance : String(acct.balance || '0');
      const balance = parseFloat(balanceStr.replace(/,/g, ''));
      return sum + balance;
    }, 0);
    
    y -= 5;
    drawField('Total Assets', formatCurrency(totalAssets));
  } else {
    drawField('Bank Accounts', 'None reported');
  }

  // Real Estate Owned
  const properties = data.realEstate?.properties || [];
  if (properties.length > 0) {
    drawSectionHeader('REAL ESTATE OWNED');
    
    properties.forEach((prop, index) => {
      drawField(`Property ${index + 1} Address`, prop.address);
      drawTwoColumn('Property Type', prop.propertyType, 'Usage', prop.propertyUsage);
      drawTwoColumn('Property Value', formatCurrency(prop.propertyValue), 'Monthly Rent', formatCurrency(prop.monthlyRent));
      drawField('Monthly Expenses', formatCurrency(prop.monthlyExpenses));
      y -= 5;
    });
  }

  // Declarations
  const declarations = data.declarations || [];
  if (declarations.length > 0) {
    drawSectionHeader('DECLARATIONS');
    
    const declarationLabels: Record<string, string> = {
      'primary-residence': 'Will occupy as primary residence',
      'ownership-interest': 'Has ownership interest in property',
      'seller-affiliation': 'Relationship with seller',
      'borrowing-undisclosed': 'Undisclosed borrowing',
    };
    
    declarations.forEach((decl) => {
      const label = declarationLabels[decl.id] || decl.id;
      const answer = decl.answer === true ? 'Yes' : decl.answer === false ? 'No' : 'Not answered';
      drawField(label, answer);
    });
  }

  // Footer
  if (y < 100) addNewPage();
  y = 50;
  
  page.drawText('This document was generated electronically and does not require a signature.', {
    x: margin,
    y: y,
    size: 8,
    font: regularFont,
    color: gray,
  });
  
  page.drawText(`Reference: MB-${Date.now().toString().slice(-8)}`, {
    x: margin,
    y: y - 12,
    size: 8,
    font: regularFont,
    color: gray,
  });

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
};
