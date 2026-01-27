
# Plan: Display Company Name Instead of Job Title Under Contact Name

## Overview
Change the subtitle displayed under the contact name from job title to company name in the Master Contact List.

## Changes Required

### File: `src/pages/contacts/BorrowerList.tsx`

There are two locations where the subtitle is defined that need to be updated:

**Location 1 (Line 154-155)** - `getPendingApprovalColumns` function:
```typescript
// Change from:
const subtitle = contact.job_title || 
  (contact.source_type === 'email_import' ? 'Email' : contact.type);

// Change to:
const subtitle = contact.company || 
  (contact.source_type === 'email_import' ? 'Email' : contact.type);
```

**Location 2 (Line 342-343)** - `baseColumns` definition:
```typescript
// Change from:
const subtitle = contact.job_title || 
  (contact.source_type === 'email_import' ? 'Email' : contact.type);

// Change to:
const subtitle = contact.company || 
  (contact.source_type === 'email_import' ? 'Email' : contact.type);
```

## Result
After this change, the Contact Name column will display:
- **Primary line**: Full name (e.g., "Nardia Dixon")
- **Subtitle line**: Company name (e.g., "Crosscountry Mortgage") instead of job title

If no company is set, it will fall back to showing the source type.
