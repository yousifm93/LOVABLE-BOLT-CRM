

# Widen Modal and Increase Description Lines

## Changes Required

### File: `src/components/modals/InitialApprovalConditionsModal.tsx`

Two simple adjustments:

1. **Increase modal width** (line 149)
   - Change `max-w-6xl` to `max-w-7xl` (adds ~128px width)

2. **Show 3 lines of description** (line 270)
   - Change `line-clamp-2` to `line-clamp-3`

---

## Technical Details

| Line | Current | New |
|------|---------|-----|
| 149 | `max-w-6xl` | `max-w-7xl` |
| 270 | `line-clamp-2` | `line-clamp-3` |

This gives the description text more room to display the full condition details while also widening the overall modal for better readability.

