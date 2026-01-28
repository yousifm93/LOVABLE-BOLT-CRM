
# Plan: Enhance Lender Marketing Updates System

## Overview
Enhance the `parse-lender-marketing-data` edge function to improve lender identification accuracy, implement product de-duplication via CRM cross-reference, add min/max validation logic, and ensure complete data extraction.

---

## Current State
The system currently:
- Detects lender marketing emails via keyword matching
- Extracts data using AI (Gemini) with function calling
- Matches lenders by name/email domain
- Creates suggestions for field updates
- UI allows approve/deny of suggestions

## Issues to Fix

| Issue | Current Behavior | Required Behavior |
|-------|-----------------|-------------------|
| Lender ID | Often returns "Unknown Lender" | Must detect from sender, subject, body, signature |
| Product Duplication | Suggests "Yes" even if already "Yes" in CRM | Cross-reference CRM first, skip duplicates |
| Synonym Handling | Different phrases create multiple suggestions | Normalize to single concept |
| Min/Max Logic | No validation direction | Min values: only if lower; Max values: only if higher |
| Extraction Completeness | May stop early | Scan full email for all products |

---

## Implementation

### 1. Enhanced AI System Prompt

Update the system prompt in `parse-lender-marketing-data/index.ts` to be more explicit:

```text
You are an expert at extracting structured data from wholesale mortgage lender marketing emails.

CRITICAL RULE - LENDER IDENTIFICATION:
- The lender_name field is MANDATORY. "Unknown Lender" is NEVER acceptable.
- Detect lender name from these sources (in priority order):
  1. From/sender display name and email address
  2. Email subject line
  3. Company name in email signature
  4. Headers, logos, or first lines of email body
  5. Email domain (e.g., @jmaclending.com → "JMAC Lending")
- Normalize minimally: trim whitespace, remove obvious noise
- DO NOT remove distinctive words like "Company", "Mortgage", "Bank", "Lending"
- If truly no lender identifier exists after checking ALL sources, THEN use "Unknown Lender"

PRODUCT DETECTION:
- Identify ALL product types mentioned before extracting values
- Normalize product names to canonical forms:
  - "Foreign National Program/Product/Financing/Loans" → product_foreign_national
  - "Bank Statement Program/Product/Loans" → product_bank_statement
  - "DSCR Program/Product/Financing" → product_dscr
- For each product, set to "Y" only if email explicitly states lender OFFERS it
- Set to "N" if email explicitly states NOT offered
- Leave null if not mentioned

DATA EXTRACTION:
- Scan the ENTIRE email - do not stop after finding a few fields
- For EACH distinct product section (FHA, VA, DSCR, Jumbo, etc.), extract:
  - Min/Max FICO (as integers, e.g., 620)
  - Min/Max Loan Amount (as "$X,XXX,XXX")
  - Max LTV/CLTV (as "XX%")
  - Occupancy/property type constraints
  - Documentation requirements
- Multiple products in one email should all be extracted

IMPORTANT: Only extract explicitly stated values. Never infer.
```

### 2. Product Synonym Map

Add a normalization map to standardize product names:

```typescript
const PRODUCT_SYNONYM_MAP: Record<string, string> = {
  // Foreign National variations
  'foreign national program': 'product_foreign_national',
  'foreign national product': 'product_foreign_national',
  'foreign national financing': 'product_foreign_national',
  'foreign national loans': 'product_foreign_national',
  'foreign nationals': 'product_foreign_national',
  'foreign national offering': 'product_foreign_national',
  
  // Bank Statement variations
  'bank statement program': 'product_bank_statement',
  'bank statement product': 'product_bank_statement',
  'bank statement loans': 'product_bank_statement',
  '12-month bank statement': 'product_bank_statement',
  '24-month bank statement': 'product_bank_statement',
  
  // DSCR variations
  'dscr program': 'product_dscr',
  'dscr product': 'product_dscr',
  'dscr financing': 'product_dscr',
  'dscr loans': 'product_dscr',
  'debt service coverage': 'product_dscr',
  
  // Continue for all product types...
};

function normalizeProductName(rawName: string): string | null {
  const lower = rawName.toLowerCase().trim();
  return PRODUCT_SYNONYM_MAP[lower] || null;
}
```

### 3. CRM Cross-Reference Before Suggestions

Add logic to check existing lender data before creating suggestions:

```typescript
// Before creating a suggestion for a product field
for (const mapping of fieldMappings) {
  const extractedValue = extractedData[mapping.extracted];
  const currentValue = matchedLender[mapping.db];
  
  // Skip if no extracted value
  if (!extractedValue) continue;
  
  const extractedStr = String(extractedValue);
  const currentStr = currentValue ? String(currentValue) : null;
  
  // CRITICAL: Skip if CRM already has the same value (avoid duplicates)
  if (extractedStr === currentStr) {
    console.log(`[parse-lender-marketing-data] Skipping ${mapping.db}: CRM already has value "${currentStr}"`);
    continue;
  }
  
  // For product fields (Y/N), skip if already "Y" and new value is also "Y"
  if (mapping.db.startsWith('product_') && currentStr === 'Y' && extractedStr === 'Y') {
    console.log(`[parse-lender-marketing-data] Skipping ${mapping.db}: Already marked as Yes`);
    continue;
  }
  
  // Only create suggestion if value is different or currently null
  suggestions.push({...});
}
```

### 4. Min/Max Validation Logic

Add directional validation for min/max fields:

```typescript
// Helper to parse numeric values from strings
function parseNumericValue(value: string): number | null {
  if (!value) return null;
  // Handle "$1,500,000" or "1500000" or "620"
  const cleaned = value.replace(/[$,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// Before creating min field suggestions
function shouldUpdateMinField(fieldName: string, newValue: string, currentValue: string | null): boolean {
  if (!currentValue) return true; // Always update if currently null
  
  const newNum = parseNumericValue(newValue);
  const currentNum = parseNumericValue(currentValue);
  
  if (newNum === null || currentNum === null) return true; // Can't compare
  
  // Min fields: only update if new value is LOWER (less restrictive)
  return newNum < currentNum;
}

// Before creating max field suggestions
function shouldUpdateMaxField(fieldName: string, newValue: string, currentValue: string | null): boolean {
  if (!currentValue) return true; // Always update if currently null
  
  const newNum = parseNumericValue(newValue);
  const currentNum = parseNumericValue(currentValue);
  
  if (newNum === null || currentNum === null) return true; // Can't compare
  
  // Max fields: only update if new value is HIGHER (more generous)
  return newNum > currentNum;
}

// Field type classifications
const MIN_FIELDS = ['min_fico', 'min_loan_amount'];
const MAX_FIELDS = ['max_loan_amount', 'max_ltv', 'dscr_max_ltv', 'bs_loan_max_ltv'];
```

### 5. Enhanced Metadata in Suggestions

Add source metadata to each suggestion:

```typescript
const suggestionRecords = suggestions.map(s => ({
  email_log_id: emailLogId,
  lender_id: matchedLender?.id || null,
  is_new_lender: s.field_name === 'new_lender',
  suggested_lender_name: s.field_name === 'new_lender' ? extractedData.lender_name : null,
  field_name: s.field_name,
  current_value: s.current_value,
  suggested_value: s.suggested_value,
  confidence: s.confidence,
  reason: s.reason,
  status: 'pending',
  // NEW: Add source metadata
  source_metadata: JSON.stringify({
    email_subject: subject,
    email_from: fromEmail,
    email_timestamp: new Date().toISOString(),
    source_phrases: extractedData.notes || null,
  }),
}));
```

### 6. Enhanced Lender Detection

Improve the fallback lender detection when AI returns unknown:

```typescript
// If AI didn't extract lender name, try to detect from email metadata
function detectLenderFromEmail(subject: string, fromEmail: string, body: string): string | null {
  // Try 1: Extract from sender email domain
  if (fromEmail) {
    const domain = fromEmail.split('@')[1]?.toLowerCase();
    if (domain) {
      // Known domain mappings
      const domainMappings: Record<string, string> = {
        'lsmortgage.com': 'LoanStream Mortgage',
        'jmaclending.com': 'JMAC Lending',
        'accmortgage.com': 'ACC Mortgage',
        'fundloans.com': 'Fund Loans',
        // Add more mappings
      };
      if (domainMappings[domain]) return domainMappings[domain];
      
      // Extract from domain name (e.g., "townemortgage.com" → "Towne Mortgage")
      const domainName = domain.split('.')[0];
      if (domainName.length > 3) {
        // Convert camelCase/lowercase to title case
        const formatted = domainName
          .replace(/([A-Z])/g, ' $1')
          .replace(/(mortgage|lending|bank|capital|financial)/gi, ' $1')
          .replace(/\s+/g, ' ')
          .trim()
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join(' ');
        return formatted;
      }
    }
  }
  
  // Try 2: Extract from subject line patterns
  const subjectPatterns = [
    /^(?:Fwd?:\s*)?(?:Re:\s*)?([\w\s]+)\s+(?:Program|Product|Rate|Pricing|Update)/i,
    /from\s+([\w\s]+)\s*$/i,
  ];
  for (const pattern of subjectPatterns) {
    const match = subject.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  
  return null;
}

// Use after AI extraction
if (!extractedData.lender_name || extractedData.lender_name === 'Unknown Lender') {
  const detectedLender = detectLenderFromEmail(subject, fromEmail, body || htmlBody || '');
  if (detectedLender) {
    extractedData.lender_name = detectedLender;
    console.log('[parse-lender-marketing-data] Detected lender from metadata:', detectedLender);
  }
}
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/functions/parse-lender-marketing-data/index.ts` | Enhanced AI prompt, product synonym map, CRM cross-reference, min/max validation, lender detection fallback |

---

## Technical Details

### Processing Flow (Updated)

```text
1. Receive email content
   ↓
2. AI extracts structured data with enhanced prompt
   ↓
3. If lender_name is null/Unknown → Run fallback detection
   ↓
4. Match lender in CRM (existing logic)
   ↓
5. For each extracted field:
   a. Check if CRM already has same value → SKIP
   b. For product Y/N: if CRM has Y and new is Y → SKIP
   c. For min fields: if new > current → SKIP (more restrictive)
   d. For max fields: if new < current → SKIP (more restrictive)
   e. Otherwise → Create suggestion
   ↓
6. Insert de-duplicated suggestions with source metadata
```

### Min/Max Field Logic

| Field Type | Update Condition | Rationale |
|------------|------------------|-----------|
| min_fico | new < current | Lower min = less restrictive |
| min_loan_amount | new < current | Lower min = more accessible |
| max_loan_amount | new > current | Higher max = more generous |
| max_ltv | new > current | Higher LTV = more leverage |
| dscr_max_ltv | new > current | Higher LTV = more generous |

### Product Deduplication Example

```text
Email: "Fund Loans now offers Foreign National Financing!"
CRM for Fund Loans: product_foreign_national = Y

Result: NO suggestion created (already marked Yes)
```

---

## Testing Scenarios

1. **Lender Detection**: Send email from "info@newwavemortgage.com" - should detect "New Wave Mortgage"
2. **Duplicate Product**: Email says "We offer DSCR" when CRM already has DSCR=Y - should skip
3. **Min FICO Backwards**: Current 580, email says 620 - should skip (more restrictive)
4. **Max LTV Forward**: Current 75%, email says 80% - should create suggestion
5. **Product Synonyms**: "Foreign National Financing" and "Foreign National Program" in same email - single suggestion

---

## Database Changes

Add `source_metadata` column to store email context (optional, can use existing `reason` field):

```sql
-- Optional: Add source_metadata if needed
ALTER TABLE lender_field_suggestions 
ADD COLUMN IF NOT EXISTS source_metadata jsonb DEFAULT NULL;
```

---

## Outcome

After implementation:
- No more "Unknown Lender" when lender name exists in email
- No duplicate product suggestions when CRM already has the value
- No backwards min/max updates that make limits more restrictive
- Complete extraction of all products mentioned in each email
- Better metadata trail for audit purposes
