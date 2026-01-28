

# Plan: Fix Lender Marketing Suggestion Approval for Duplicate Lenders

## Root Cause

The approval button fails silently because:
1. **LeadPlus Wholesale** already exists in the `lenders` table (created previously)
2. But the field suggestions are marked as `is_new_lender: true` with no `lender_id`
3. When you click approve, the code tries to INSERT a new lender → **unique constraint violation**
4. The error happens but the toast may not be visible, making it seem like clicks don't register

**Database evidence:**
- LeadPlus Wholesale exists: ID `844095db-8889-49c3-aadc-76794a28e17b`
- Suggestions have `is_new_lender: true` and `lender_id: null`
- Postgres logs show repeated "duplicate key" errors

---

## Solution

Modify the `approveSuggestion` function in `useLenderMarketingSuggestions.tsx` to:

1. **Check if lender already exists** when `is_new_lender` is true
2. **If exists**: Update the existing lender's field instead of inserting
3. **If doesn't exist**: Create the new lender as before

---

## Technical Changes

### File: `src/hooks/useLenderMarketingSuggestions.tsx`

**Location:** Lines 139-175 (approveSuggestion function)

**Current logic:**
```typescript
if (suggestion.is_new_lender && suggestion.suggested_lender_name) {
  // Insert new lender - FAILS if already exists
  const { error: insertError } = await supabase
    .from('lenders')
    .insert({...});
}
```

**New logic:**
```typescript
if (suggestion.is_new_lender && suggestion.suggested_lender_name) {
  // First check if lender already exists
  const { data: existingLender } = await supabase
    .from('lenders')
    .select('id')
    .ilike('lender_name', suggestion.suggested_lender_name)
    .single();

  if (existingLender) {
    // Lender exists - update the field on existing lender
    const updateData = { [suggestion.field_name]: suggestion.suggested_value };
    const { error: updateError } = await supabase
      .from('lenders')
      .update(updateData)
      .eq('id', existingLender.id);

    if (updateError) {
      toast.error('Failed to update existing lender field');
      return false;
    }
    toast.success(`Updated ${suggestion.field_name} on ${suggestion.suggested_lender_name}`);
  } else {
    // Lender doesn't exist - create new (original logic)
    const { error: insertError } = await supabase
      .from('lenders')
      .insert({
        lender_name: suggestion.suggested_lender_name,
        status: 'Pending',
        [suggestion.field_name]: suggestion.suggested_value, // Also set the field!
      });
    
    if (insertError) {
      toast.error('Failed to create new lender');
      return false;
    }
    toast.success(`Created new lender: ${suggestion.suggested_lender_name}`);
  }
}
```

---

## Additional Improvement

When creating a **new lender**, also set the suggested field value on the new lender record. Currently it only creates the lender with `lender_name` and `status`, ignoring the actual field update (e.g., `max_ltv: 90%`).

---

## Summary

| Current Behavior | Fixed Behavior |
|------------------|----------------|
| Fails silently on duplicate lender name | Checks if lender exists first |
| Tries INSERT → unique constraint error | Uses UPDATE if lender exists |
| New lender created without field values | New lender includes the suggested field |

