

## Plan: Reset and Configure 16 Daily Rate Scenarios with 30-Minute Spacing

### Overview
This plan will:
1. Clear all existing rate-related cron jobs
2. Create 16 new cron jobs spaced 30 minutes apart, starting at midnight Eastern
3. Fix the "always show a rate" issue so rate boxes never appear empty

---

### Part 1: Clear Existing Cron Jobs

Currently active rate cron jobs to remove:
- `refresh-15yr-fixed-daily` (11:05 UTC)
- `refresh-fha-30yr-daily` (11:10 UTC)

SQL to unschedule:
```sql
SELECT cron.unschedule('refresh-15yr-fixed-daily');
SELECT cron.unschedule('refresh-fha-30yr-daily');
```

---

### Part 2: Schedule 16 Scenarios (30 minutes apart)

Using Eastern Time (midnight = 5:00 UTC), all scenarios will run between midnight and 7:30 AM ET:

| Time (ET) | Time (UTC) | Scenario | Scenario Type |
|-----------|------------|----------|---------------|
| 12:00 AM | 5:00 | 15yr Fixed 80% | `15yr_fixed` |
| 12:30 AM | 5:30 | 15yr Fixed 90% | `15yr_fixed_90ltv` |
| 1:00 AM | 6:00 | 15yr Fixed 95% | `15yr_fixed_95ltv` |
| 1:30 AM | 6:30 | 15yr Fixed 97% | `15yr_fixed_97ltv` |
| 2:00 AM | 7:00 | 30yr Fixed 70% | `30yr_fixed_70ltv` |
| 2:30 AM | 7:30 | 30yr Fixed 80% | `30yr_fixed` |
| 3:00 AM | 8:00 | 30yr Fixed 95% | `30yr_fixed_95ltv` |
| 3:30 AM | 8:30 | 30yr Fixed 97% | `30yr_fixed_97ltv` |
| 4:00 AM | 9:00 | FHA 30yr 96.5% | `fha_30yr_965ltv` |
| 4:30 AM | 9:30 | Bank Stmt 70% | `bank_statement_70ltv` |
| 5:00 AM | 10:00 | Bank Stmt 80% | `bank_statement` |
| 5:30 AM | 10:30 | Bank Stmt 85% | `bank_statement_85ltv` |
| 6:00 AM | 11:00 | Bank Stmt 90% | `bank_statement_90ltv` |
| 6:30 AM | 11:30 | DSCR 70% | `dscr_70ltv` |
| 7:00 AM | 12:00 | DSCR 75% | `dscr_75ltv` |
| 7:30 AM | 12:30 | DSCR 80% | `dscr` |

Each cron job calls the `fetch-single-rate` edge function with the appropriate `scenario_type`.

---

### Part 3: Fix "Always Show a Rate" Issue

**Problem**: The current code only looks back 10 days in `daily_market_updates` table. If a scenario hasn't run in 10 days or ever, it shows "—".

**Solution**: Modify `fetchMarketData` in `MarketRatesCard.tsx` to:
1. First try merging from recent `daily_market_updates` (current behavior)
2. For any still-null fields, query `pricing_runs` table for the most recent completed run of that scenario type

**Code Change** in `src/components/dashboard/MarketRatesCard.tsx`:

```typescript
// After merging from daily_market_updates, check pricing_runs for any still-null fields
const scenarioToFieldMapping: Record<string, { rateField: string; pointsField: string }> = {
  '15yr_fixed': { rateField: 'rate_15yr_fixed', pointsField: 'points_15yr_fixed' },
  '15yr_fixed_90ltv': { rateField: 'rate_15yr_fixed_90ltv', pointsField: 'points_15yr_fixed_90ltv' },
  // ... all 16 scenarios
};

// For each scenario with null values, fetch from pricing_runs
for (const [scenario, fields] of Object.entries(scenarioToFieldMapping)) {
  if (mergedData[fields.rateField] === null) {
    const { data: latestRun } = await supabase
      .from('pricing_runs')
      .select('results_json')
      .eq('scenario_type', scenario)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (latestRun?.results_json) {
      const results = latestRun.results_json;
      mergedData[fields.rateField] = parseFloat(String(results.rate).replace(/[^0-9.]/g, ''));
      mergedData[fields.pointsField] = results.discount_points ? 100 - results.discount_points : null;
    }
  }
}
```

This ensures that every rate box displays the most recent rate available, regardless of when it was last run.

---

### Part 4: Files to Modify

| File | Changes |
|------|---------|
| Database (via SQL) | Unschedule old cron jobs, create 16 new cron jobs |
| `src/components/dashboard/MarketRatesCard.tsx` | Update `fetchMarketData` to fall back to `pricing_runs` |

---

### Expected Outcome

1. **Tonight at midnight ET**: First scenario (15yr Fixed 80%) runs
2. **Every 30 minutes**: Next scenario runs
3. **By 7:30 AM ET**: All 16 scenarios completed
4. **Dashboard**: Always shows a rate in every yellow box (never "—")

The 30-minute spacing gives Axiom plenty of time to complete each run before the next one starts, avoiding the conflicts that caused previous failures.

