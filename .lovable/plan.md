
# Plan: Remove 90% LTV from 15-Year Fixed and 70% LTV from 30-Year Fixed

## Summary

Remove two pricing scenarios that are no longer needed:
1. **15-Year Fixed @ 90% LTV** (`15yr_fixed_90ltv`)
2. **30-Year Fixed @ 70% LTV** (`30yr_fixed_70ltv`)

This reduces the total number of daily automated pricing runs, improving reliability and reducing Axiom API load.

---

## Changes Overview

| Location | What to Remove |
|----------|----------------|
| `fetch-daily-rates` edge function | Both scenario definitions from the `scenarios` array |
| `fetch-single-rate` edge function | Both scenario configs from `scenarioConfigs` object |
| `MarketRatesCard.tsx` UI | Both rate cards from the dashboard display |
| Supabase cron jobs | Unschedule the cron jobs for these two scenarios (manual step) |

---

## File Changes

### 1. `supabase/functions/fetch-daily-rates/index.ts`

**Remove Lines 222-230** - Delete the `15yr_fixed_90ltv` scenario:
```typescript
// Remove this block (around line 222-230):
{
  ...baseScenario90LTV,
  loan_type: 'Conventional',
  income_type: 'Full Doc - 24M',
  dscr_ratio: '',
  scenario_type: '15yr_fixed_90ltv',
  loan_term: 15
},
```

**Remove Lines 169-177** - Delete the `30yr_fixed_70ltv` scenario:
```typescript
// Remove this block (around line 169-177):
{
  ...baseScenario70LTV,
  loan_type: 'Conventional',
  income_type: 'Full Doc - 24M',
  dscr_ratio: '',
  scenario_type: '30yr_fixed_70ltv',
  loan_term: 30
},
```

### 2. `supabase/functions/fetch-single-rate/index.ts`

**Remove Lines 214-220** - Delete the `15yr_fixed_90ltv` config:
```typescript
// Remove this block:
'15yr_fixed_90ltv': {
  ...baseScenario90LTV,
  loan_type: 'Conventional',
  income_type: 'Full Doc - 24M',
  dscr_ratio: '',
  loan_term: 15,
},
```

**Remove Lines 167-173** - Delete the `30yr_fixed_70ltv` config:
```typescript
// Remove this block:
'30yr_fixed_70ltv': {
  ...baseScenario70LTV,
  loan_type: 'Conventional',
  income_type: 'Full Doc - 24M',
  dscr_ratio: '',
  loan_term: 30,
},
```

### 3. `src/components/dashboard/MarketRatesCard.tsx`

**Remove Lines 633-642** - Delete the 90% LTV card from 15-Year Fixed column:
```typescript
// Remove this RateCard:
<RateCard 
  label="90% LTV" 
  rate={marketData?.rate_15yr_fixed_90ltv ?? null} 
  points={marketData?.points_15yr_fixed_90ltv ?? null}
  onClick={() => handleRateCardClick('15yr_fixed_90ltv')}
  onRefresh={() => handleRefreshSingle('15yr_fixed_90ltv')}
  isRefreshing={refreshingTypes.has('15yr_fixed_90ltv')}
  lastUpdated={lastUpdatedByScenario['15yr_fixed_90ltv']}
  disabled={isDisabled && !refreshingTypes.has('15yr_fixed_90ltv')}
/>
```

**Remove Lines 670-679** - Delete the 70% LTV card from 30-Year Fixed column:
```typescript
// Remove this RateCard:
<RateCard 
  label="70% LTV" 
  rate={marketData?.rate_30yr_fixed_70ltv ?? null} 
  points={marketData?.points_30yr_fixed_70ltv ?? null}
  onClick={() => handleRateCardClick('30yr_fixed_70ltv')}
  onRefresh={() => handleRefreshSingle('30yr_fixed_70ltv')}
  isRefreshing={refreshingTypes.has('30yr_fixed_70ltv')}
  lastUpdated={lastUpdatedByScenario['30yr_fixed_70ltv']}
  disabled={isDisabled && !refreshingTypes.has('30yr_fixed_70ltv')}
/>
```

---

## Manual Step: Unschedule Cron Jobs

After the code changes, you'll need to unschedule the cron jobs in Supabase for these two scenarios. Run this SQL in the Supabase SQL Editor:

```sql
-- View existing cron jobs to find the exact names
SELECT * FROM cron.job WHERE jobname LIKE '%15yr_fixed_90ltv%' OR jobname LIKE '%30yr_fixed_70ltv%';

-- Then unschedule them (replace with actual job names from query above)
-- SELECT cron.unschedule('job-name-for-15yr_fixed_90ltv');
-- SELECT cron.unschedule('job-name-for-30yr_fixed_70ltv');
```

---

## Result After Changes

| Column | Before | After |
|--------|--------|-------|
| **15yr Fixed** | 80%, 90%, 95%, 97% | 80%, 95%, 97% |
| **30yr Fixed** | 70%, 80%, 95%, 97% | 80%, 95%, 97% |

Total daily scenarios: Reduced by 2 (fewer API calls, less overlap risk)

---

## Files to Modify

| File | Action |
|------|--------|
| `supabase/functions/fetch-daily-rates/index.ts` | Remove 2 scenario objects |
| `supabase/functions/fetch-single-rate/index.ts` | Remove 2 scenario configs |
| `src/components/dashboard/MarketRatesCard.tsx` | Remove 2 RateCard components |
