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