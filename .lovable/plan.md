
# Plan: Improve Search Result Context Display

## Summary

Update the sidebar search to show more useful context for each result:
- **Leads/Borrowers**: Show the pipeline stage they're in (Leads, Pending App, Screening, Active, etc.) instead of email
- **Contacts**: Show the contact type (Agent, Realtor, Lender, Other, etc.) instead of email

---

## Current vs. New Behavior

| Type | Current Subtext | New Subtext |
|------|-----------------|-------------|
| Lead | `serge.chestak@yahoo.com` | `Active` or `Screening` |
| Agent | `Brokerage name` | `Brokerage name` (unchanged) |
| Lender | `Account executive name` | `Account executive name` (unchanged) |
| Contact | `Agent` or `email` | `Agent` or `Other` (type emphasized) |

---

## Changes

### 1. Add Pipeline Stage Name Mapping

Create a constant that maps pipeline stage IDs to human-readable names:

```typescript
const PIPELINE_STAGE_NAMES: Record<string, string> = {
  'c54f417b-3f67-43de-80f5-954cf260d571': 'Leads',
  '44d74bfb-c4f3-4f7d-a69e-e47ac67a5945': 'Pending App',
  'a4e162e0-5421-4d17-8ad5-4b1195bbc995': 'Screening',
  '09162eec-d2b2-48e5-86d0-9e66ee8b2af7': 'Pre-Qualified',
  '3cbf38ff-752e-4163-a9a3-1757499b4945': 'Pre-Approved',
  '76eb2e82-e1d9-4f2d-a57d-2120a25696db': 'Active',
  'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd': 'Past Clients',
  '5c3bd0b1-414b-4eb8-bad8-99c3b5ab8b0a': 'Idle',
};
```

### 2. Update Lead Search Results

Change the lead subtext from email to pipeline stage name:

```typescript
// Before
subtext: l.email || undefined,

// After
subtext: PIPELINE_STAGE_NAMES[l.pipeline_stage_id] || 'Unknown Stage',
```

### 3. Update Contact Search Results

Ensure contacts show their type clearly (already works but we'll make it consistent):

```typescript
// Before
subtext: c.type || c.email || undefined,

// After - prioritize type, fall back to "Contact" if no type
subtext: c.type || 'Contact',
```

### 4. Add Contact Icon

Add a missing icon for contacts in the search results:

```typescript
{result.type === 'contact' && <Users className="h-4 w-4 text-orange-500" />}
```

---

## Visual Result

After implementation, searching for "Serge" would show:

```text
🔵 Serge Chestak           [lead]
   Active

📞 Sergio Speian           [agent]
   ABC Realty

🟠 Sergio Gonzalez         [contact]
   Agent
```

This provides immediate context about where the person is in the system.

---

## File Changes

| File | Change |
|------|--------|
| `src/components/AppSidebar.tsx` | Add `PIPELINE_STAGE_NAMES` constant |
| `src/components/AppSidebar.tsx` | Update lead subtext to show stage name |
| `src/components/AppSidebar.tsx` | Update contact subtext to prioritize type |
| `src/components/AppSidebar.tsx` | Add icon for contact type in search results |
