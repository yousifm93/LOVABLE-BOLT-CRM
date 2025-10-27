/**
 * Utility functions for formatting data in the CRM system
 */

export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (!amount) return "—";
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return "—";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount);
};

export const formatPercentage = (value: number | string | null | undefined): string => {
  if (!value) return "—";
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return "—";
  return `${numValue.toFixed(2)}%`;
};

export const maskSSN = (ssn: string | null | undefined): string => {
  if (!ssn) return "—";
  // If SSN is already masked or only last 4 digits, return as is
  if (ssn.length <= 4) return ssn;
  // Mask all but last 4 digits
  const lastFour = ssn.slice(-4);
  return `***-**-${lastFour}`;
};

export const formatYesNo = (value: boolean | string | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  if (typeof value === 'boolean') return value ? "Yes" : "No";
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === 'yes' || lower === '1') return "Yes";
    if (lower === 'false' || lower === 'no' || lower === '0') return "No";
  }
  return "—";
};

export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  } catch {
    return "—";
  }
};

export const formatAddress = (address: any): string => {
  if (!address) return "—";
  if (typeof address === 'string') return address;
  
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.zip) parts.push(address.zip);
  
  return parts.length > 0 ? parts.join(', ') : "—";
};

export const formatAmortizationTerm = (months: number | null | undefined): string => {
  if (!months) return "—";
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (years === 0) return `${months} months`;
  if (remainingMonths === 0) return `${years} years`;
  return `${years} years, ${remainingMonths} months`;
};

// DateTime formatter
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return "—";
  }
};

// Boolean formatter
export const formatBoolean = (value: boolean | null | undefined): string => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  return "—";
};

// Phone formatter
export const formatPhone = (value: string | null | undefined): string => {
  if (!value) return "—";
  // Remove all non-numeric characters
  const cleaned = value.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return value;
};

// File name formatter (extract filename from path)
export const formatFileName = (value: string | null | undefined): string => {
  if (!value) return "—";
  const parts = value.split('/');
  return parts[parts.length - 1] || value;
};

// Number formatter with commas
export const formatNumber = (value: number | null | undefined): string => {
  if (!value && value !== 0) return "—";
  return value.toLocaleString('en-US');
};

// Short date formatter (MON DD)
export const formatDateShort = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  } catch {
    return "—";
  }
};

/**
 * Calculate monthly mortgage payment (Principal & Interest only)
 * @param loanAmount - Principal loan amount
 * @param annualInterestRate - Annual interest rate as percentage (e.g., 7 for 7%)
 * @param termInMonths - Loan term in months (e.g., 360 for 30 years)
 * @returns Monthly P&I payment, or null if inputs invalid
 */
export const calculateMonthlyPayment = (
  loanAmount: number | null | undefined,
  annualInterestRate: number | null | undefined,
  termInMonths: number | null | undefined
): number | null => {
  // Validate inputs
  if (!loanAmount || !annualInterestRate || !termInMonths) return null;
  if (loanAmount <= 0 || annualInterestRate < 0 || termInMonths <= 0) return null;
  
  // Special case: 0% interest rate (interest-free loan)
  if (annualInterestRate === 0) {
    return loanAmount / termInMonths;
  }
  
  // Convert annual rate to monthly decimal rate
  const monthlyRate = annualInterestRate / 100 / 12;
  
  // Calculate using mortgage payment formula: M = P[r(1+r)^n]/[(1+r)^n-1]
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, termInMonths);
  const denominator = Math.pow(1 + monthlyRate, termInMonths) - 1;
  
  const monthlyPayment = loanAmount * (numerator / denominator);
  
  // Round to 2 decimal places
  return Math.round(monthlyPayment * 100) / 100;
};

/**
 * Format time at current address (years and months)
 * @param years - Number of years
 * @param months - Number of months
 * @returns Formatted string like "2 years, 3 months" or "—" if both null
 */
export const formatTimeAtAddress = (
  years: number | null | undefined,
  months: number | null | undefined
): string => {
  if (!years && !months) return "—";
  
  const parts = [];
  if (years) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  
  return parts.join(', ');
};