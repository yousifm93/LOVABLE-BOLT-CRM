
# Add AUS Approval Document Parsing Feature

## Overview

When a user uploads a document to the "AUS Approval" slot in Active File Documents, the system will automatically parse the DU/LPA findings document using AI and extract all required conditions/documentation items. A confirmation modal will appear allowing the user to review, edit, and select which conditions to import into the condition list.

---

## Architecture (Follows Existing Pattern)

The implementation mirrors the existing Initial Approval parsing flow:

```text
User uploads AUS file → File stored in Supabase Storage
    ↓
parseAusApproval() triggered → Calls parse-aus-approval edge function
    ↓
Edge function downloads file → Sends to Gemini AI with your prompt
    ↓
AI returns checklist items → Converted to conditions format
    ↓
Modal appears → User reviews/edits/selects conditions
    ↓
Confirmed → Conditions saved to lead_conditions table
```

---

## Files to Create/Modify

### 1. NEW: Edge Function - `supabase/functions/parse-aus-approval/index.ts`

Creates a new edge function that:
- Downloads the uploaded PDF via signed URL
- Converts to base64 for AI processing
- Sends to Gemini AI with your custom prompt (adapted for structured output)
- Returns conditions in the same format as initial approval

**AI Prompt** (adapted from your ChatGPT prompt):
```text
You are a mortgage processing assistant. Extract ONLY the required conditions/documentation from this AUS Findings document (DU or LPA).

For each requirement, categorize it:
- credit: Credit-related
- title: Title-related  
- income: Income/Employment
- property: Property/Appraisal
- insurance: Insurance
- borrower: Assets/Funds/Borrower docs
- other: Everything else

EXTRACTION RULES:
- ONE LINE PER ITEM - clear action + document
- ONLY include items that require action/documentation
- Do NOT include general commentary or AUS metadata
- Do NOT include items marked as "not required"
- For conditional items, use wording like: "If using self-employed income: ..."
- Remove duplicates

Return JSON:
{
  "conditions": [
    {
      "category": "income|credit|property|borrower|insurance|title|other",
      "description": "Clear action item text",
      "phase": "AUS"
    }
  ],
  "aus_info": {
    "decision": "Approve/Eligible",
    "case_id": "...",
    "risk_class": "..."
  }
}
```

### 2. MODIFY: `src/components/lead-details/ActiveFileDocuments.tsx`

Add new function `parseAusApproval()` following the same pattern as `parseInitialApproval()`:
- Get signed URL for uploaded file
- Call new edge function
- On success, populate `pendingConditions` state
- Show the existing `InitialApprovalConditionsModal` (reuse it)

Modify `handleFileUpload()` to trigger parsing when `aus_approval_file` is uploaded (around line 484).

### 3. MODIFY: `src/components/modals/InitialApprovalConditionsModal.tsx`

Small update to make the modal title/description dynamic based on document type:
- Accept optional `documentType` prop: `'initial_approval' | 'aus_approval'`
- Display "Import Conditions from AUS Findings" when type is `aus_approval`
- Otherwise show current "Import Conditions from Initial Approval"

---

## Technical Implementation Details

### Edge Function (`parse-aus-approval/index.ts`)

```typescript
// Structure mirrors parse-initial-approval
serve(async (req) => {
  const { file_url } = await req.json();
  
  // Download and convert to base64
  const fileResponse = await fetch(file_url);
  const base64 = arrayBufferToBase64(await fileResponse.blob().arrayBuffer());
  
  // Call Gemini with your prompt
  const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: AUS_EXTRACTION_PROMPT },
        { role: 'user', content: [
          { type: 'text', text: 'Extract AUS conditions...' },
          { type: 'image_url', image_url: { url: `data:application/pdf;base64,${base64}` }}
        ]}
      ]
    })
  });
  
  // Parse and return conditions
  return Response.json({ success: true, conditions: [...], aus_info: {...} });
});
```

### ActiveFileDocuments.tsx Changes

Add around line 280 (after `parseInitialApproval`):

```typescript
const parseAusApproval = async (filePath: string) => {
  try {
    setParsing('aus_approval_file');
    
    const { data: signedUrlData } = await supabase.storage
      .from('lead-documents')
      .createSignedUrl(filePath, 3600);

    toast({
      title: "Parsing AUS Findings",
      description: "Extracting conditions from AUS document..."
    });

    const { data, error } = await supabase.functions.invoke('parse-aus-approval', {
      body: { file_url: signedUrlData.signedUrl }
    });

    if (data?.success && data?.conditions?.length > 0) {
      setPendingConditions({
        conditions: data.conditions,
        loanInfo: data.aus_info // Optional AUS metadata
      });
      setShowConditionsModal(true);
    }
  } catch (error) { ... }
  finally { setParsing(null); }
};
```

Modify `handleFileUpload` around line 484 to add:

```typescript
} else if (fieldKey === 'aus_approval_file') {
  await parseAusApproval(uploadData.path);
  // onLeadUpdate called after modal closes
```

---

## User Experience Flow

1. User drags/uploads PDF to **AUS Approval** slot
2. Toast: "Parsing AUS Findings - Extracting conditions..."
3. AI processes document (5-15 seconds)
4. Modal appears with extracted checklist items:
   - Grouped by category (Income, Credit, Property, etc.)
   - Each item has checkbox, editable description, responsible party, ETA
   - Phase defaults to "AUS"
5. User reviews, unchecks irrelevant items, edits if needed
6. Click "Import X Conditions"
7. Conditions saved to `lead_conditions` table
8. Toast: "Successfully imported X conditions"

---

## Edge Cases Handled (Per Your Prompt)

- **No conditions found**: Show toast "No explicit AUS conditions found"
- **Approve/Ineligible**: Still extract conditions (loan limit issues don't stop parsing)
- **Conditional items**: Preserved with "If..." wording
- **Duplicates**: AI prompt instructs to remove duplicates
- **Non-actionable items**: Filtered out per prompt rules

---

## Summary

| Component | Action |
|-----------|--------|
| `supabase/functions/parse-aus-approval/index.ts` | CREATE - New edge function with your AUS prompt |
| `src/components/lead-details/ActiveFileDocuments.tsx` | MODIFY - Add `parseAusApproval()` + trigger on upload |
| `src/components/modals/InitialApprovalConditionsModal.tsx` | MODIFY - Make title dynamic for AUS vs Initial Approval |
| `supabase/config.toml` | UPDATE - Register new edge function |

The existing modal, category mapping, and condition creation logic are fully reused.
