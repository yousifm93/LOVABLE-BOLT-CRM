
# Plan: Fix Pre-Approval Letter Address Mapping

## Problem

When generating a pre-approval letter, the address shows "No Address Yet" even though the lead has a subject property address saved (e.g., "10531 36th Street North" for Elias Hachem).

**Root Cause:** Field name mismatch between the data transformation and the modal component.

| Component | Expected Field | Actual Field in Data |
|-----------|---------------|---------------------|
| `PreApprovalLetterModal.tsx` line 55 | `client.subjectAddress1` (camelCase) | `client.subject_address_1` (snake_case) |
| `PreApprovalLetterModal.tsx` line 58 | `client.subjectCity` (camelCase) | `client.subject_city` (snake_case) |
| `PreApprovalLetterModal.tsx` line 59 | `client.subjectState` (camelCase) | `client.subject_state` (snake_case) |
| `PreApprovalLetterModal.tsx` line 60 | `client.subjectZip` (camelCase) | `client.subject_zip` (snake_case) |

The `transformLeadToClient()` function in `clientTransform.ts` correctly populates the snake_case fields (lines 314-318), but the modal is looking for the camelCase versions which don't exist.

---

## Solution

Update `PreApprovalLetterModal.tsx` to check for both field naming conventions, preferring the snake_case fields that are actually populated.

### File: `src/components/modals/PreApprovalLetterModal.tsx`

#### Change: Lines 53-62

**Current Code:**
```typescript
if (isOpen && client) {
  let propertyAddress = "No Address Yet";
  if (client.subjectAddress1) {
    const parts = [
      client.subjectAddress1,
      client.subjectCity,
      client.subjectState,
      client.subjectZip
    ].filter(Boolean);
    propertyAddress = parts.join(", ");
  }
```

**Updated Code:**
```typescript
if (isOpen && client) {
  let propertyAddress = "No Address Yet";
  // Check for snake_case fields (from transformLeadToClient) or camelCase fields
  const address1 = (client as any).subject_address_1 || client.subjectAddress1;
  const city = (client as any).subject_city || client.subjectCity;
  const state = (client as any).subject_state || client.subjectState;
  const zip = (client as any).subject_zip || client.subjectZip;
  
  if (address1) {
    const parts = [
      address1,
      city,
      state,
      zip
    ].filter(Boolean);
    propertyAddress = parts.join(", ");
  }
```

---

## Summary

| File | Change |
|------|--------|
| `src/components/modals/PreApprovalLetterModal.tsx` | Update address field references to check both snake_case and camelCase field names |

---

## Expected Result

- Pre-approval letter for Elias Hachem will correctly display "10531 36th Street North, [City], [State] [Zip]"
- Works for all leads with subject property addresses populated
- Backward-compatible with any data that uses camelCase naming

---

## Technical Notes

- The `CRMClient` type defines fields in camelCase (`subjectAddress1`, etc.)
- The `transformLeadToClient()` function maps database fields to snake_case (`subject_address_1`, etc.)
- Using `(client as any)` to access the snake_case fields avoids TypeScript errors without requiring a type update
- Long-term, the transform function could be updated to also include camelCase mappings for consistency
