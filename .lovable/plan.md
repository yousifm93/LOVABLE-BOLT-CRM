

# Plan: Restore Original Positions + Keep Right-Align Behavior

## What I'll Do

Revert the X coordinates back to the **original values** but **keep `rightAlign: true`** so the right-align logic works when you calibrate positions yourself.

## Code Changes

### File: `src/lib/loanEstimatePdfGenerator.ts`

**Current (my changes):**
```typescript
borrowerName: { x: 251, y: 121, rightAlign: true, fontSize: 8 },
lenderLoanNumber: { x: 251, y: 132, rightAlign: true, fontSize: 8 },
zipState: { x: 248, y: 143, rightAlign: true, fontSize: 8 },
date: { x: 251, y: 154, rightAlign: true, fontSize: 8 },
```

**Restored (original X values + rightAlign enabled):**
```typescript
borrowerName: { x: 232, y: 121, rightAlign: true, fontSize: 8 },
lenderLoanNumber: { x: 248, y: 132, rightAlign: true, fontSize: 8 },
zipState: { x: 245, y: 143, rightAlign: true, fontSize: 8 },
date: { x: 244, y: 154, rightAlign: true, fontSize: 8 },
```

## How Right-Align Works for You

With `rightAlign: true` enabled, when you use the Calibrate Positions panel:

- The X value you set = where the **right edge** of the text will be
- Short text like "1187878" will end at that X position
- Long text like "11878781234567" will ALSO end at that same X position, extending leftward

This means you can calibrate once using any text length, and it will work for all lengths.

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/loanEstimatePdfGenerator.ts` | Restore original X coordinates while keeping rightAlign: true |

