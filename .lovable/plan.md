

## Plan: Create Pre-Qualification Email Template

### Summary

I'll create a new email template called "Pre-Qualification Email" that matches the format shown in your screenshots. The template will use merge tags from your CRM to automatically populate borrower information, loan details, and agent names.

---

### Email Template Details

**Template Name:** `Loan Pre-Qualification`

**Subject Line (for reference):** [Loan Pre-Qualification] - {{borrower_name}}

---

### Template Content Structure

Based on the screenshots you provided, the email will include:

#### 1. Greeting Section
- Personalized greeting using `{{first_name}}`

#### 2. Congratulations Section
- "Pre-Qualified" badge/highlight with green background
- Bullet list with loan terms:
  - **Purchase Price:** `{{sales_price}}`
  - **Down Payment:** `{{down_pmt}}`
  - **Loan Amount:** `{{loan_amount}}`

#### 3. Disclaimer Section
- Note that this is not the maximum approval
- Information about moving toward full pre-approval with document review

#### 4. What's Next Section (numbered list)
1. **Book a Quick Call with Our Team** - Link placeholder for calendar booking
2. **Complete Credit Authorization** - Link placeholder for credit auth form
3. **Work with Your Agent** - References `{{buyer_agent_first_name}}` for personalization
4. **Keep Us Updated** - General communication reminder

#### 5. Closing
- Encouraging closing statement
- Ends with "Best," (no signature - per your system rules, signatures are added by the sender)

---

### Merge Tags Used

| Merge Tag | Description | Source |
|-----------|-------------|--------|
| `{{first_name}}` | Borrower's first name | CONTACT INFO |
| `{{sales_price}}` | Purchase price | LOAN INFO |
| `{{down_pmt}}` | Down payment amount | LOAN INFO |
| `{{loan_amount}}` | Loan amount | LOAN INFO |
| `{{buyer_agent_first_name}}` | Agent's first name | AGENT & LENDER FIELDS |

---

### Implementation

**File to Modify:** None directly (database insert only)

**Database Operation:**
Insert a new row into the `email_templates` table with:
- `name`: "Loan Pre-Qualification"
- `html`: The full HTML template with merge tags
- `show_in_lead_details`: `true` (so it appears in the Send Email section)

---

### HTML Template Preview

```text
┌────────────────────────────────────────────────────────────────────┐
│ Hi {{first_name}},                                                 │
│                                                                    │
│ I hope you're doing well.                                          │
│                                                                    │
│ Congratulations! Your profile looks great, and you are             │
│ [PRE-QUALIFIED] for the following terms:                           │
│                                                                    │
│   • Purchase Price: {{sales_price}}                                │
│   • Down Payment: {{down_pmt}}                                     │
│   • Loan Amount: {{loan_amount}}                                   │
│                                                                    │
│ Please keep in mind this is not your maximum approval. Once we     │
│ complete document review, we'll be able to finalize numbers more   │
│ precisely.                                                         │
│                                                                    │
│ This pre-qualification is based on the information provided in     │
│ your loan application, positioning you strongly as you move        │
│ forward.                                                           │
│                                                                    │
│ ─────────────────────────────────────────────────────────────────  │
│ What's Next?                                                       │
│                                                                    │
│ 1. Book a Quick Call with Our Team – Let's connect to review       │
│    your options, answer questions, and discuss next steps.         │
│    Choose a time HERE                                              │
│                                                                    │
│ 2. Complete Credit Authorization – Please complete the credit      │
│    authorization via this link: HERE                               │
│                                                                    │
│ 3. Work with Your Agent – Connect with {{buyer_agent_first_name}}  │
│    to begin your property search. We'll coordinate with them       │
│    to strategize on your behalf.                                   │
│                                                                    │
│ 4. Keep Us Updated – If anything changes along the way, let us     │
│    know. We're here to ensure a smooth and seamless experience.    │
│                                                                    │
│ ─────────────────────────────────────────────────────────────────  │
│                                                                    │
│ Let us know how we can assist - we're excited to help you get      │
│ into your new home!                                                │
│                                                                    │
│ Best,                                                              │
└────────────────────────────────────────────────────────────────────┘
```

---

### Technical Implementation

I will create a **database migration** that inserts this template directly into the `email_templates` table. The HTML will include:

- Proper styling with `font-family: Arial, sans-serif`
- The "Pre-Qualified" text styled with a green/yellow highlight (`background-color: #dcfce7; color: #166534;`)
- Proper `<ul>` and `<ol>` tags for lists
- Bold text for emphasis using `<strong>` tags
- Link placeholders for the booking calendar and credit authorization

---

### Notes

- The "HERE" links in the template are placeholders that the team will replace with actual URLs when sending
- The template ends with "Best," only - no signature block (as per your email sending rules, signatures are added by the sender)
- Template will show in the Lead Details "Send Email" section due to `show_in_lead_details: true`

