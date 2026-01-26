

## Plan: Update Pre-Qualification Email Template

### Summary

I'll update the "Loan Pre-Qualification" email template to fix the down payment formatting and add the actual links for the calendar booking and credit authorization.

---

### Changes Required

#### 1. Down Payment Formatting
**Issue:** The `{{down_pmt}}` merge tag displays without a dollar sign (showing "39500" instead of "$39,500")

**Solution:** Change the merge tag from `{{down_pmt}}` to `{{down_pmt_formatted}}` which includes proper currency formatting with dollar sign and commas

> Note: I'll need to verify this formatted tag exists, or alternatively we can use `{{down_pmt}}` with a `$` prefix in the HTML if the value already includes comma formatting

#### 2. Add Calendly Link
**Current:** `<a href="#">HERE</a>` (placeholder)
**New:** `<a href="https://calendly.com/yousif-mortgage/pa">HERE</a>`

#### 3. Add Credit Authorization Link
**Current:** `<a href="#">HERE</a>` (placeholder)
**New:** `<a href="https://credit.advcredit.com/smartpay/SmartPay.aspx?uid=6b0276d4-7fae-412b-a82f-54ad11aad331#forward">HERE</a>`

---

### Implementation

**Database Migration:** Create a new migration to UPDATE the existing email template

```sql
UPDATE public.email_templates
SET html = '<updated HTML with fixes>',
    version = version + 1,
    updated_at = now()
WHERE name = 'Loan Pre-Qualification';
```

---

### Updated Template Sections

**Loan Terms List (with $ prefix for down payment):**
```html
<ul>
  <li><strong>Purchase Price:</strong> {{sales_price}}</li>
  <li><strong>Down Payment:</strong> ${{down_pmt}}</li>
  <li><strong>Loan Amount:</strong> {{loan_amount}}</li>
</ul>
```

**What's Next Section (with real links):**
```html
<li><strong>Book a Quick Call with Our Team</strong> – ... 
    <a href="https://calendly.com/yousif-mortgage/pa">HERE</a></li>
<li><strong>Complete Credit Authorization</strong> – ... 
    <a href="https://credit.advcredit.com/smartpay/SmartPay.aspx?uid=...">HERE</a></li>
```

---

### Files to Modify

| File | Change |
|------|--------|
| New migration file | UPDATE the email template with fixed down payment display and real links |

