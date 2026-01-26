
## Fix: Badge Text Wrapping Issue in Email List

### Problem
The "New Contact" badge text is wrapping onto two lines when there's not enough horizontal space, causing a visual overlap issue. This happens because the badge button lacks `whitespace-nowrap` CSS to prevent text from breaking.

### Root Cause
The badge buttons in both `NewContactsPopover.tsx` and `LenderMarketingPopover.tsx` don't have the `whitespace-nowrap` class, allowing the browser to wrap the text when space is constrained.

---

### Solution

Add `whitespace-nowrap` to prevent text from ever wrapping inside badges. This ensures the text always stays on a single line, maintaining the proper badge appearance.

---

### Files to Modify

| File | Change |
|------|--------|
| `src/components/email/NewContactsPopover.tsx` | Add `whitespace-nowrap` to button className |
| `src/components/email/LenderMarketingPopover.tsx` | Add `whitespace-nowrap` to button className (consistency) |

---

### Code Changes

**NewContactsPopover.tsx (line 140)**
```typescript
// BEFORE:
"bg-purple-500/20 text-purple-600 border border-purple-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-purple-500/30 transition-colors font-medium inline-flex items-center gap-1"

// AFTER:
"bg-purple-500/20 text-purple-600 border border-purple-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-purple-500/30 transition-colors font-medium inline-flex items-center gap-1 whitespace-nowrap"
```

**LenderMarketingPopover.tsx (line 386)**
```typescript
// BEFORE:
"bg-blue-500/20 text-blue-600 border border-blue-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-blue-500/30 transition-colors font-medium inline-flex items-center gap-1"

// AFTER:
"bg-blue-500/20 text-blue-600 border border-blue-500/30 text-[10px] px-1.5 py-0 h-5 rounded-full hover:bg-blue-500/30 transition-colors font-medium inline-flex items-center gap-1 whitespace-nowrap"
```

---

### Result

- "New Contact" badge will always display on a single line
- "Lender Marketing" badge will always display on a single line
- No text wrapping or overlap issues regardless of container width
- Badges maintain consistent appearance across all email rows
