
# Plan: Enhance Bulk Lender Email Feature

## Overview
Enhance the BulkLenderEmailModal to include:
1. User email signatures (auto-appended based on logged-in user)
2. Fix reply-to to scenarios@mortgagebolt.org
3. Updated default message template with proper spacing
4. Title case conversion for lender names (preserving acronyms)
5. File attachment capability

---

## Current State
- **Email signatures**: Already stored in `users.email_signature` for all team members
- **Lender names**: Currently stored as ALL CAPS (e.g., "ACRA", "ANGEL OAK")
- **Reply-to**: Currently uses crmUser.email, should be scenarios@mortgagebolt.org
- **Attachments**: Not supported in bulk lender emails

---

## Changes

### 1. Email Signature Integration

**File:** `src/components/modals/BulkLenderEmailModal.tsx`

- Fetch the logged-in user's `email_signature` from the database
- Replace "Best regards, Yousif Mohamed" with just "Best" followed by the signature
- The signature HTML includes the user's photo, name, contact info, etc.

```typescript
// Fetch user's email signature
const [userSignature, setUserSignature] = useState<string | null>(null);

useEffect(() => {
  if (crmUser?.id) {
    supabase.from('users')
      .select('email_signature')
      .eq('id', crmUser.id)
      .single()
      .then(({ data }) => setUserSignature(data?.email_signature || null));
  }
}, [crmUser?.id]);

// Update default body to end with "Best" + signature placeholder
const [body, setBody] = useState(`<p>Hello {{AccountExecutiveFirstName}},</p>
<p>I wanted to reach out regarding a loan scenario for {{LenderName}}.</p>
<p>Best,</p>`);

// Append signature when sending
const finalBody = userSignature 
  ? `${personalizedBody}<br><br>${userSignature}` 
  : personalizedBody;
```

### 2. Fix Reply-To Address

**File:** `src/components/modals/BulkLenderEmailModal.tsx`

Change the reply-to from crmUser.email to always be "scenarios@mortgagebolt.org":

```typescript
// Line 89 - Change from:
const replyToEmail = crmUser?.email || user?.email || "yousif@mortgagebolt.org";

// To:
const replyToEmail = "scenarios@mortgagebolt.org"; // Always reply to scenarios
```

Update the display field as well (line 149 and 228-235).

### 3. Title Case Lender Names

**File:** `src/lib/utils.ts` (add utility function)

Create a smart title case function that preserves acronyms:

```typescript
// Known acronyms that should stay uppercase
const LENDER_ACRONYMS = ['EPM', 'PRMG', 'UWM', 'FEMBI', 'BAC', 'A&D'];

export function toLenderTitleCase(name: string): string {
  if (!name) return name;
  
  // Check if entire name is a known acronym
  if (LENDER_ACRONYMS.includes(name.toUpperCase())) {
    return name.toUpperCase();
  }
  
  // Split by spaces and convert each word
  return name.split(' ').map(word => {
    const upper = word.toUpperCase();
    // Keep acronyms uppercase
    if (LENDER_ACRONYMS.includes(upper) || word.length <= 2) {
      return upper;
    }
    // Title case: first letter uppercase, rest lowercase
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
}

// Examples:
// "ACRA" → "Acra"
// "ANGEL OAK" → "Angel Oak"
// "BB AMERICAS" → "BB Americas"  
// "EPM" → "EPM" (acronym preserved)
// "JMAC Lending" → "Jmac Lending" (already mixed case stays)
// "UWM" → "UWM" (acronym preserved)
```

**File:** `src/components/modals/BulkLenderEmailModal.tsx`

Apply title case in merge tag replacement:

```typescript
import { toLenderTitleCase } from "@/lib/utils";

const replaceMergeTags = (text: string, lender: Lender): string => {
  const firstName = lender.account_executive?.split(' ')[0] || 'Team';
  const formattedLenderName = toLenderTitleCase(lender.lender_name);
  
  return text
    .replace(/\{\{AccountExecutiveFirstName\}\}/g, firstName)
    .replace(/\{\{AccountExecutiveName\}\}/g, lender.account_executive || 'Team')
    .replace(/\{\{LenderName\}\}/g, formattedLenderName);
};
```

### 4. File Attachment Support

**File:** `src/components/modals/BulkLenderEmailModal.tsx`

Add attachment state and file upload UI:

```typescript
interface Attachment {
  file: File;
  name: string;
  type: string;
}

const [attachments, setAttachments] = useState<Attachment[]>([]);

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  const newAttachments = files.map(file => ({
    file,
    name: file.name,
    type: file.type
  }));
  setAttachments(prev => [...prev, ...newAttachments]);
};

const removeAttachment = (index: number) => {
  setAttachments(prev => prev.filter((_, i) => i !== index));
};

// Convert files to base64 for SendGrid
const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};
```

Add attachment UI component:

```tsx
{/* Attachments Section */}
<div className="space-y-2">
  <Label>Attachments</Label>
  <div className="flex flex-wrap gap-2">
    {attachments.map((att, index) => (
      <Badge key={index} variant="secondary" className="flex items-center gap-1">
        <Paperclip className="h-3 w-3" />
        {att.name}
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 ml-1"
          onClick={() => removeAttachment(index)}
        >
          <X className="h-3 w-3" />
        </Button>
      </Badge>
    ))}
    <label>
      <input
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      />
      <Button variant="outline" size="sm" asChild>
        <span className="cursor-pointer">
          <Paperclip className="h-4 w-4 mr-1" />
          Add Files
        </span>
      </Button>
    </label>
  </div>
</div>
```

**File:** `supabase/functions/send-direct-email/index.ts`

Update to support attachments:

```typescript
interface SendDirectEmailRequest {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  from_email: string;
  from_name: string;
  reply_to?: string;
  attachments?: Array<{
    content: string; // base64
    filename: string;
    type: string;
  }>;
}

// In email payload building:
if (attachments && attachments.length > 0) {
  emailPayload.attachments = attachments.map(att => ({
    content: att.content,
    filename: att.filename,
    type: att.type,
    disposition: 'attachment'
  }));
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/utils.ts` | Add `toLenderTitleCase()` function |
| `src/components/modals/BulkLenderEmailModal.tsx` | Email signature, reply-to fix, title case, attachments |
| `supabase/functions/send-direct-email/index.ts` | Support attachments in SendGrid payload |

---

## Default Message Template (Updated)

**Before:**
```html
<p>Hello {{AccountExecutiveFirstName}},</p>
<p><br></p>
<p>I wanted to reach out regarding a loan scenario for {{LenderName}}.</p>
<p><br></p>
<p>Best regards,<br>Yousif Mohamed</p>
```

**After:**
```html
<p>Hello {{AccountExecutiveFirstName}},</p>
<p>I wanted to reach out regarding a loan scenario for {{LenderName}}.</p>
<p>Best,</p>
<!-- Email signature auto-appended here when sending -->
```

---

## Lender Name Conversion Examples

| Original (Database) | After Title Case |
|---------------------|------------------|
| ACRA | Acra |
| ANGEL OAK | Angel Oak |
| BB AMERICAS | BB Americas |
| EPM | EPM (acronym) |
| FUND LOANS | Fund Loans |
| JMAC Lending | Jmac Lending |
| KIND LENDING | Kind Lending |
| PRMG | PRMG (acronym) |
| UWM | UWM (acronym) |
| A&D | A&D (acronym) |

---

## Summary of Changes

1. **Email Signature**: Fetches from `users.email_signature` and appends after "Best,"
2. **Reply-To**: Changed to always be `scenarios@mortgagebolt.org`
3. **Message Template**: Cleaner spacing, ends with "Best," (signature appended automatically)
4. **Lender Names**: Title case conversion preserving known acronyms
5. **Attachments**: File picker with base64 conversion sent via SendGrid API
