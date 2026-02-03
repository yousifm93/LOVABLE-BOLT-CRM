

## Plan: Update Down Payment Percentages for Conventional Condos

### Summary

Update **70 condos** that are missing down payment values based on their review type. Most condos already have the correct values - we're just filling in the gaps.

---

## What Will Change

| Review Type | Primary Down | Second Home Down | Investment Down | Condos to Update |
|-------------|--------------|------------------|-----------------|------------------|
| **Conventional Full** | 3% | 10% | 15% | 39 condos |
| **Conventional Limited** | 10% | 25% | 30% | 31 condos |

---

## Implementation

### Database Migration

Create a single SQL migration that updates the down payment fields for all condos based on their review type:

```sql
-- Update Conventional Full condos with missing down payments
UPDATE condos
SET 
  primary_down = '3%',
  second_down = '10%',
  investment_down = '15%',
  updated_at = NOW()
WHERE review_type = 'Conventional Full'
  AND deleted_at IS NULL
  AND (primary_down IS NULL OR primary_down = '');

-- Update Conventional Limited condos with missing down payments
UPDATE condos
SET 
  primary_down = '10%',
  second_down = '25%',
  investment_down = '30%',
  updated_at = NOW()
WHERE review_type = 'Conventional Limited'
  AND deleted_at IS NULL
  AND (primary_down IS NULL OR primary_down = '');
```

---

## Result After Migration

- **70 condos** will have their down payment values filled in
- All **1,560 Conventional condos** will have consistent down payment values based on their review type
- The condo list UI will display the correct percentages immediately

---

## Files to Create

| File | Description |
|------|-------------|
| `supabase/migrations/[timestamp]_update_conventional_down_payments.sql` | Migration to backfill missing down payment values |

---

## Notes

- This migration only updates condos that are **missing** down payment values (NULL or empty)
- Condos that already have down payment values will **not** be modified
- The `updated_at` timestamp will be set so you can track when the change was made

