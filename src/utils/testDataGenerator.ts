import { Field } from "@/contexts/FieldsContext";

/**
 * Generate realistic test data for a given field based on its type
 */
export function generateTestValue(field: Field, rowIndex: number): string {
  const { field_type, field_name, dropdown_options } = field;

  // Sample names for rotation
  const names = ["John Smith", "Sarah Johnson", "Michael Brown", "Emily Davis", "David Wilson"];
  const firstNames = ["John", "Sarah", "Michael", "Emily", "David"];
  const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Wilson"];
  const emails = ["john.smith@email.com", "sarah.j@email.com", "michael.b@email.com", "emily.d@email.com", "david.w@email.com"];
  const phones = ["(555) 123-4567", "(555) 234-5678", "(555) 345-6789", "(555) 456-7890", "(555) 567-8901"];
  const addresses = ["123 Main St, Boston MA", "456 Oak Ave, NYC NY", "789 Pine Rd, LA CA", "321 Elm St, Miami FL", "654 Maple Dr, Austin TX"];
  const lenders = ["Wells Fargo", "Chase", "Bank of America", "Quicken Loans", "CitiMortgage"];
  const agents = ["Jane Cooper", "Tom Anderson", "Lisa Martinez", "James Taylor", "Maria Garcia"];

  switch (field_type) {
    case 'text':
      if (field_name.includes('name') && field_name.includes('first')) return firstNames[rowIndex % firstNames.length];
      if (field_name.includes('name') && field_name.includes('last')) return lastNames[rowIndex % lastNames.length];
      if (field_name.includes('borrower') || field_name.includes('client')) return names[rowIndex % names.length];
      if (field_name.includes('address')) return addresses[rowIndex % addresses.length];
      if (field_name.includes('lender')) return lenders[rowIndex % lenders.length];
      if (field_name.includes('agent')) return agents[rowIndex % agents.length];
      if (field_name.includes('loan_number') || field_name.includes('lender_loan_number')) return `LN${100000 + rowIndex}`;
      return `Sample ${rowIndex + 1}`;

    case 'email':
      return emails[rowIndex % emails.length];

    case 'phone':
      return phones[rowIndex % phones.length];

    case 'currency':
      const amounts = [250000, 350000, 425000, 500000, 275000];
      return `$${amounts[rowIndex % amounts.length].toLocaleString()}`;

    case 'number':
      if (field_name.includes('fico') || field_name.includes('score')) return `${720 + rowIndex * 10}`;
      if (field_name.includes('dti')) return `${38 + rowIndex}%`;
      if (field_name.includes('rate')) return `${6.5 + rowIndex * 0.125}%`;
      return `${100 + rowIndex * 10}`;

    case 'percentage':
      return `${35 + rowIndex * 5}%`;

    case 'date':
      const dates = ['Nov 25', 'Dec 1', 'Dec 15', 'Jan 5', 'Jan 20'];
      return dates[rowIndex % dates.length];

    case 'datetime':
      const datetimes = ['Nov 25 10:00 am', 'Dec 1 2:30 pm', 'Dec 15 9:15 am', 'Jan 5 11:45 am', 'Jan 20 3:00 pm'];
      return datetimes[rowIndex % datetimes.length];

    case 'select':
    case 'dropdown':
      if (dropdown_options && dropdown_options.length > 0) {
        return dropdown_options[rowIndex % dropdown_options.length];
      }
      return 'Option 1';

    case 'boolean':
      return rowIndex % 2 === 0 ? 'Yes' : 'No';

    case 'link':
    case 'url':
      return 'https://example.com';

    default:
      return `Value ${rowIndex + 1}`;
  }
}

/**
 * Generate multiple rows of test data
 */
export function generateTestRows(fields: Field[], rowCount: number = 5): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  
  for (let i = 0; i < rowCount; i++) {
    const row: Record<string, string> = {};
    fields.forEach(field => {
      row[field.field_name] = generateTestValue(field, i);
    });
    rows.push(row);
  }
  
  return rows;
}
