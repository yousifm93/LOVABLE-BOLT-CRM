

## Plan: Fix Down Payment Currency Formatting

### Problem

The down payment field (`down_pmt`) is displaying without commas because:
- The data is stored as raw numbers (e.g., `37500`, `274400`)
- The `crm_fields` table has `down_pmt` marked as `field_type: 'text'` instead of `'currency'`
- The email edge function only applies comma formatting to fields marked as `currency`

### Solution

Update the `crm_fields` table to change `down_pmt` from `text` to `currency` type. This will:
- Make the edge function automatically format it with `$` and commas (e.g., `$39,500`)
- Maintain consistency with other currency fields like `sales_price` and `loan_amount`

Also update the email template to remove the manual `$` prefix since the currency formatting will add it automatically.

---

### Implementation

**Database Changes:**

1. Update `crm_fields` to set `down_pmt` field type to `currency`
2. Update `email_templates` to change `${{down_pmt}}` back to `{{down_pmt}}`

**SQL Migration:**
```sql
-- Update field type to currency for proper formatting
UPDATE public.crm_fields 
SET field_type = 'currency'
WHERE field_name = 'down_pmt';

-- Update email template to remove manual $ prefix (now handled by formatting)
UPDATE public.email_templates
SET html = REPLACE(html, '${{down_pmt}}', '{{down_pmt}}'),
    version = version + 1,
    updated_at = now()
WHERE name = 'Loan Pre-Qualification';
```

---

### How It Works

The `send-template-email` edge function already has this logic (lines 131-132):

```typescript
if (field.field_type === 'currency' && value != null) {
  mergeData[field.field_name] = `$${Number(value).toLocaleString()}`;
}
```

By marking `down_pmt` as `currency`, it will now output `$39,500` instead of `39500`.

---

### Result

| Field | Before | After |
|-------|--------|-------|
| Down Payment | $39500 | $39,500 |

