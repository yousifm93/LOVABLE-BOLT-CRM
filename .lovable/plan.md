
# Fix: Borrower Conditions Not Visible

## Root Cause Identified

The issue is an **RLS policy mismatch** between the `leads` and `lead_conditions` tables:

| Table | RLS Policy | Effect |
|-------|------------|--------|
| `leads` | `team_read_leads` with `USING (true)` | All authenticated users can view all leads |
| `lead_conditions` | Account-based check | Only users in the same account as the lead can view conditions |

This causes users to see a lead's details but not its conditions, because they can access the lead (permissive policy) but fail the conditions check (account-based policy).

### Affected Users
Users not in account `47e707c5-62d0-4ee9-99a3-76572c73a8e1` cannot see conditions:
- Salma@mortgagebolt.org
- yousif@mortgagebolt.org  
- yousif@mortgagebolt.com

Users who CAN see conditions:
- Herman@mortgagebolt.org ✅
- Processing@mortgagebolt.org ✅
- yousifminc@gmail.com ✅

---

## Recommended Fix

**Update the RLS SELECT policy on `lead_conditions`** to match the `leads` table behavior - allow all authenticated users to view conditions.

### SQL Migration

```sql
-- Drop the existing restrictive SELECT policies
DROP POLICY IF EXISTS "Users can select conditions for their account leads" ON lead_conditions;
DROP POLICY IF EXISTS "Users can view conditions for their account leads" ON lead_conditions;

-- Create new permissive SELECT policy matching leads table
CREATE POLICY "Authenticated users can view lead conditions"
  ON lead_conditions
  FOR SELECT
  TO authenticated
  USING (true);
```

This keeps INSERT, UPDATE, and DELETE restricted to account-based access (existing policies), but allows all authenticated users to VIEW conditions - matching the behavior of the `leads` table.

---

## Alternative: Fix User Profiles

If the intent is to restrict conditions by account, update the `profiles` table to put all team members in the same account:

```sql
UPDATE profiles 
SET account_id = '47e707c5-62d0-4ee9-99a3-76572c73a8e1'
WHERE user_id IN (
  SELECT auth_user_id FROM users 
  WHERE email IN ('Salma@mortgagebolt.org', 'yousif@mortgagebolt.org')
);
```

---

## Impact

After applying the fix:
- All authenticated users will be able to view conditions for any lead they can see
- INSERT/UPDATE/DELETE operations remain restricted to account-based access
- Matches the existing `leads` table access pattern

---

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Add permissive SELECT policy for `lead_conditions` |

No frontend code changes needed - the existing `ConditionsTab.tsx` will work correctly once RLS allows access.
