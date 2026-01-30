
# Plan: Change BOLT Estimate PDF Font to Open Sans

## Summary

Currently, the Loan Estimate PDF generator uses **Helvetica** (a standard PDF font), but your template was designed with **Open Sans** from Canva. To make the dynamically-placed numbers match the template text, we'll embed the Open Sans font into the PDF generation process using the `@pdf-lib/fontkit` package (which is already installed in your project).

---

## Current State

The PDF generator at `src/lib/loanEstimatePdfGenerator.ts` uses:

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// ...
const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
```

This embeds the built-in Helvetica font, which doesn't match your Open Sans template.

---

## Solution

### Step 1: Add Open Sans Font Files to the Project

Download the Open Sans font files (TTF format) and place them in the `public/fonts/` directory:

| File | Purpose |
|------|---------|
| `OpenSans-Regular.ttf` | Regular weight text |
| `OpenSans-Bold.ttf` | Bold text (for totals) |

You can download these from [Google Fonts - Open Sans](https://fonts.google.com/specimen/Open+Sans).

### Step 2: Update the PDF Generator

Modify `src/lib/loanEstimatePdfGenerator.ts` to:

1. Import `fontkit` from `@pdf-lib/fontkit`
2. Register fontkit with the PDF document
3. Fetch and embed the Open Sans font files
4. Use the custom fonts instead of StandardFonts.Helvetica

```text
┌─────────────────────────────────────────────────────────────┐
│ Current Flow                                                │
│                                                             │
│  PDFDocument.create()                                       │
│       ↓                                                     │
│  embedFont(StandardFonts.Helvetica)                        │
│       ↓                                                     │
│  Draw text with Helvetica                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ New Flow                                                    │
│                                                             │
│  PDFDocument.create()                                       │
│       ↓                                                     │
│  pdfDoc.registerFontkit(fontkit)                           │
│       ↓                                                     │
│  Fetch /fonts/OpenSans-Regular.ttf                         │
│  Fetch /fonts/OpenSans-Bold.ttf                            │
│       ↓                                                     │
│  embedFont(fontBytes) for each                             │
│       ↓                                                     │
│  Draw text with Open Sans                                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Details

### File: `src/lib/loanEstimatePdfGenerator.ts`

**Add import:**
```typescript
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
```

**Update font embedding (lines 211-213):**
```typescript
// Register fontkit for custom fonts
pdfDoc.registerFontkit(fontkit);

// Fetch Open Sans font files
const regularFontBytes = await fetch('/fonts/OpenSans-Regular.ttf').then(r => r.arrayBuffer());
const boldFontBytes = await fetch('/fonts/OpenSans-Bold.ttf').then(r => r.arrayBuffer());

// Embed custom fonts
const regularFont = await pdfDoc.embedFont(regularFontBytes);
const boldFont = await pdfDoc.embedFont(boldFontBytes);
```

### Directory: `public/fonts/`

Create this folder and add:
- `OpenSans-Regular.ttf`
- `OpenSans-Bold.ttf`

---

## Font Acquisition

You'll need to provide the Open Sans TTF font files. Options:

1. **Download from Google Fonts**: Visit https://fonts.google.com/specimen/Open+Sans and download the font family
2. **Export from Canva**: If Canva allows font export for your plan
3. **Use a CDN** (alternative): Fetch directly from Google Fonts CDN, though local files are more reliable

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Import fontkit, register it, fetch and embed Open Sans TTF files |
| `public/fonts/OpenSans-Regular.ttf` | New file (you provide) |
| `public/fonts/OpenSans-Bold.ttf` | New file (you provide) |

---

## Expected Result

After this change, all dynamically-placed text on the BOLT Estimate PDF (borrower name, loan amounts, fees, totals) will render in Open Sans, matching the text already baked into your Canva template image.
