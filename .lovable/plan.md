
# Plan: Update Pre-Approval Letter Font to Match Canva Template

## The Challenge

**Canva Sans is a proprietary font** owned by Canva that cannot be exported or used outside of the Canva platform. There is no TTF/OTF file available for download.

## Recommended Solution

Since your Pre-Approval Letter template already has the static Canva Sans text baked into the background image, we should use **Open Sans** (which you already have in your project) for the dynamic overlay text. Open Sans is visually very similar to Canva Sans - both are clean, modern sans-serif fonts with similar letter proportions.

---

## Current State

The Pre-Approval Letter generator (`src/lib/pdfGenerator.ts`) currently uses:

```typescript
const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
```

---

## Changes to Make

### File: `src/lib/pdfGenerator.ts`

1. **Import fontkit** to enable custom font embedding
2. **Register fontkit** with the PDF document
3. **Fetch and embed Open Sans fonts** (already in `/public/fonts/`)
4. **Update template field positions** to use the new fonts

### Code Changes

**Add import:**
```typescript
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
```

**Replace font embedding (lines 20-24):**
```typescript
// Register fontkit for custom fonts
pdfDoc.registerFontkit(fontkit);

// Fetch and embed Open Sans fonts
const regularFontBytes = await fetch('/fonts/OpenSans-Regular.ttf').then(r => r.arrayBuffer());
const boldFontBytes = await fetch('/fonts/OpenSans-Bold.ttf').then(r => r.arrayBuffer());
const regularFont = await pdfDoc.embedFont(regularFontBytes);
const boldFont = await pdfDoc.embedFont(boldFontBytes);

// For italic, we'll use regular with slight styling or keep Helvetica Oblique as fallback
const italicFont = regularFont; // Open Sans Regular works for the expiration date
const black = rgb(0, 0, 0);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/pdfGenerator.ts` | Import fontkit, register it, embed Open Sans fonts |

## No New Files Needed

The Open Sans font files (`OpenSans-Regular.ttf` and `OpenSans-Bold.ttf`) are already in your `public/fonts/` directory from the Loan Estimate change.

---

## Alternative: True Canva Sans Match

If you absolutely need the exact Canva Sans font, the only options would be:
1. Bake ALL text into your Canva template image (no dynamic overlay)
2. Find a different font in Canva that has an open-source equivalent

---

## Expected Result

After this change, the Pre-Approval Letter's dynamic text (borrower name, loan amount, dates, etc.) will render in **Open Sans**, which closely matches the Canva Sans text already in your template image. This provides a consistent, professional appearance.
