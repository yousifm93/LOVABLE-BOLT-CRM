

# Improve AUS Conditions Import Modal Layout

## User Requirements

Based on the screenshot and feedback:

1. **Condition Name Field**: The main input box should contain a concise, editable "name" for the condition (e.g., "2 months of bank statements", "Document omitting liability")
2. **Description Below**: Show the full condition text in smaller font below the name for reference
3. **Remove Due Date**: Omit the ETA/date picker column since due dates aren't known at import time

---

## Current Layout (Per Screenshot)

```
[✓] | [Long truncated condition text in input...] | Responsible ▼ | mm/dd/yyyy | AUS
```

**Problems:**
- Full condition text crammed into input box - gets truncated
- Hard to read/understand the condition at a glance
- Due date field takes up space but isn't useful during import

---

## New Layout

```
[✓] | [Condition Name (concise, editable)]        | Responsible ▼ | AUS
    | Description in smaller gray text below...
```

**Benefits:**
- Clear, scannable condition names
- Full description available for reference
- More horizontal space without the date column
- Better UX for reviewing/editing before import

---

## Technical Changes

### File 1: `supabase/functions/parse-aus-approval/index.ts`

Update the AI prompt to return both a `name` and `description` field:

```json
{
  "conditions": [
    {
      "category": "income",
      "name": "2 months of bank statements",
      "description": "Provide most recent 2 months of bank statements for all accounts used for down payment and closing costs",
      "phase": "AUS"
    }
  ]
}
```

The AI will generate concise names while preserving the full condition text as description.

### File 2: `src/components/modals/InitialApprovalConditionsModal.tsx`

1. **Update Interface**:
   ```typescript
   interface ExtractedCondition {
     category: string;
     name?: string;        // NEW: concise condition name
     description: string;  // Full condition text
     phase?: string;
     responsible?: string;
   }
   ```

2. **Add name editing state**:
   ```typescript
   const [editedNames, setEditedNames] = useState<Map<number, string>>(new Map());
   ```

3. **New Row Layout** (change from 12-col to simpler layout):
   - Column 1: Checkbox
   - Column 2: Name input (editable) + description text below
   - Column 3: Responsible dropdown
   - Column 4: Phase label
   - ~~Column 5: ETA date picker~~ (REMOVED)

4. **Updated grid structure**:
   ```tsx
   <div className="grid grid-cols-12 gap-2 p-3 rounded-lg border">
     {/* Checkbox */}
     <div className="col-span-1 flex items-start pt-2">
       <Checkbox ... />
     </div>
     
     {/* Name + Description */}
     <div className="col-span-7 space-y-1">
       <Input
         value={getFinalName(index, condition.name || condition.description)}
         onChange={(e) => handleNameChange(index, e.target.value)}
         className="text-sm font-medium"
         placeholder="Condition name..."
       />
       <p className="text-xs text-muted-foreground line-clamp-2">
         {condition.description}
       </p>
     </div>
     
     {/* Responsible */}
     <div className="col-span-2">
       <Select ...>
         ...
       </Select>
     </div>
     
     {/* Phase */}
     <div className="col-span-2 flex items-center">
       <span className="text-xs text-muted-foreground">
         {condition.phase}
       </span>
     </div>
   </div>
   ```

5. **Update confirm handler** to save the edited name as the condition description (what gets stored in DB):
   ```typescript
   const handleConfirm = () => {
     const selected = conditions
       .map((c, i) => ({ 
         ...c, 
         description: getFinalName(i, c.name || c.description),
         responsible: getFinalResponsible(i, c.responsible) || undefined
         // No eta - removed
       }))
       .filter((_, i) => selectedIndices.has(i));
     onConfirm(selected);
   };
   ```

---

## Visual Comparison

### Before (Current)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [✓] │ [If the lender credit plus the seller credits excee...] │ Responsible ▼ │ mm/dd/yyyy │ AUS │
└────────────────────────────────────────────────────────────────────────────┘
```

### After (New)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [✓] │ [Verify seller credits within IPC limits            ]    │ Responsible ▼ │ AUS │
│     │ If the lender credit plus the seller credits exceed     │               │     │
│     │ the IPC limits, document the excess was applied to...   │               │     │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/parse-aus-approval/index.ts` | Update AI prompt to return `name` + `description` |
| `src/components/modals/InitialApprovalConditionsModal.tsx` | Add name field, show description below, remove ETA column |

---

## Backward Compatibility

- The modal will still work for Initial Approval parsing
- If `name` is not provided (legacy data), it falls back to using `description` as the editable field
- The description is always displayed below for reference

