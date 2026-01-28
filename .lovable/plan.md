

# Plan: Email Modal Improvements

## Overview
Three improvements to the lender email modals:
1. Reduce spacing between "Best," and email signature in bulk emails
2. Add email signature support to the single lender email modal
3. Make the single lender email modal taller for composing longer emails

---

## Changes

### 1. Reduce Signature Spacing (BulkLenderEmailModal.tsx)

**Current (Line 158):**
```typescript
personalizedBody = `${personalizedBody}<br><br>${userSignature}`;
```
Creates too much vertical space with double line breaks.

**Fix:** Remove one `<br>` tag:
```typescript
personalizedBody = `${personalizedBody}<br>${userSignature}`;
```

---

### 2. Add Email Signature to Single Lender Modal (SendLenderEmailModal.tsx)

**Current behavior:** Uses static text "Best regards, Yousif Mohamed"

**Changes needed:**
- Add state for user signature
- Fetch signature from database (same pattern as bulk modal)
- Update default body template to end with just "Best,"
- Append signature when sending the email

```typescript
// Add state
const [userSignature, setUserSignature] = useState<string | null>(null);

// Add useEffect to fetch signature
useEffect(() => {
  if (crmUser?.id) {
    supabase.from('users')
      .select('email_signature')
      .eq('id', crmUser.id)
      .single()
      .then(({ data }) => setUserSignature(data?.email_signature || null));
  }
}, [crmUser?.id]);

// Update body template (line 42)
setBody(`<p>Hello ${lender.account_executive || 'Team'},</p><p><br></p><p>I wanted to reach out regarding potential loan opportunities.</p><p><br></p><p>Best,</p>`);

// Update handleSend to append signature before sending
let emailBody = body;
if (userSignature) {
  emailBody = `${body}<br>${userSignature}`;
}
// Use emailBody in the API call
```

---

### 3. Increase Single Modal Height (SendLenderEmailModal.tsx)

**Current (Line 110, 177-178):**
```typescript
<DialogContent className="max-w-2xl">
...
<RichTextEditor ... className="min-h-[200px]" />
```

**Fix:** Make the modal wider and taller:
```typescript
<DialogContent className="max-w-3xl max-h-[85vh]">
...
<RichTextEditor ... className="min-h-[350px]" />
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/modals/BulkLenderEmailModal.tsx` | Line 158: Change `<br><br>` to `<br>` |
| `src/components/modals/SendLenderEmailModal.tsx` | Add signature fetch, update template, increase modal size |

---

## Summary

| Issue | Before | After |
|-------|--------|-------|
| Bulk email spacing | Double `<br><br>` before signature | Single `<br>` - tighter spacing |
| Single email signature | Static "Best regards, Yousif Mohamed" | Dynamic signature from database |
| Single modal height | 200px editor, max-w-2xl | 350px editor, max-w-3xl |

