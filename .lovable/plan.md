
# Plan: Loan Pricer Sequential Queue with Locking and Auto-Retry

## Problem Summary

Your daily rate pricing runs fail ~50% of the time because multiple Axiom jobs overlap. When a cron job triggers at 5:30 AM while the 5:00 AM job is still running, Axiom gets confused and fails with "couldn't find content during run on step 20".

## Solution: Sequential Locking + Auto-Retry

We'll implement a system where:
1. Only ONE pricing run can be in `running` status at a time
2. If Axiom is busy, the run is marked `queued` instead of triggering immediately
3. A "retry queue processor" runs every 5 minutes to process queued/failed runs
4. The edge function checks for lock before triggering Axiom

---

## Technical Changes

### 1. Database Migration - Add Queue Status and Retry Columns

Add new columns to `pricing_runs` table:
- `retry_count` (integer) - track how many times we've retried
- `max_retries` (integer, default 3) - maximum retry attempts
- `queued_at` (timestamp) - when the run was queued for retry

Also add `queued` to the status check constraint.

### 2. New Edge Function: `process-pricing-queue`

This function runs every 5 minutes via cron and:
- Finds the oldest `queued` or `failed` run that hasn't exceeded max retries
- Checks if any run is currently `running`
- If no run is running, triggers the next queued run
- Updates retry count on each attempt

### 3. Update `fetch-single-rate` Edge Function

Before triggering Axiom:
1. Check if any pricing_run has `status = 'running'`
2. If YES → set this run to `status = 'queued'` instead of triggering
3. If NO → proceed with triggering Axiom
4. Add a 90-second timeout check to auto-fail stuck runs

### 4. New Cron Job: `process-pricing-queue`

Runs every 5 minutes to retry queued/failed runs sequentially.

### 5. UI: Add "Retry Failed Runs" Button (Optional)

Add a button to the Loan Pricer page to manually trigger queue processing.

---

## Detailed Code Changes

### File 1: Database Migration

```sql
-- Add retry tracking columns
ALTER TABLE pricing_runs 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ;

-- Update status constraint to include 'queued'
ALTER TABLE pricing_runs 
DROP CONSTRAINT IF EXISTS pricing_runs_status_check;

ALTER TABLE pricing_runs 
ADD CONSTRAINT pricing_runs_status_check 
CHECK (status IN ('pending', 'queued', 'running', 'completed', 'failed', 'cancelled'));

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_pricing_runs_queued 
ON pricing_runs(status, queued_at) 
WHERE status IN ('queued', 'failed');
```

### File 2: `supabase/functions/fetch-single-rate/index.ts`

Add locking check before triggering Axiom:

```typescript
// Check if another run is currently active
const { data: activeRun } = await supabase
  .from('pricing_runs')
  .select('id, created_at')
  .eq('status', 'running')
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (activeRun) {
  // Another run is active - queue this one for later
  console.log(`Axiom busy with run ${activeRun.id}, queueing ${scenario_type}`);
  
  await supabase
    .from('pricing_runs')
    .update({ 
      status: 'queued', 
      queued_at: new Date().toISOString() 
    })
    .eq('id', pricingRun.id);
  
  return new Response(JSON.stringify({
    success: true,
    queued: true,
    message: `Run queued - Axiom busy with another run`
  }), { headers: corsHeaders });
}
```

### File 3: New Edge Function `supabase/functions/process-pricing-queue/index.ts`

Processes the queue sequentially:

```typescript
// Find oldest queued or failed run eligible for retry
const { data: nextRun } = await supabase
  .from('pricing_runs')
  .select('*')
  .in('status', ['queued', 'failed'])
  .lt('retry_count', 3)
  .order('queued_at', { ascending: true, nullsFirst: false })
  .order('created_at', { ascending: true })
  .limit(1)
  .maybeSingle();

// Check if any run is currently active
const { data: activeRun } = await supabase
  .from('pricing_runs')
  .select('id, created_at')
  .eq('status', 'running')
  .maybeSingle();

if (activeRun) {
  // Check if it's been running too long (>3 minutes = likely stuck)
  const runningFor = Date.now() - new Date(activeRun.created_at).getTime();
  if (runningFor > 180000) {
    // Mark as failed and proceed
    await supabase
      .from('pricing_runs')
      .update({ status: 'failed', error_message: 'Timed out after 3 minutes' })
      .eq('id', activeRun.id);
  } else {
    return { message: 'Another run still active' };
  }
}

if (nextRun) {
  // Trigger via loan-pricer-axiom
  await supabase.functions.invoke('loan-pricer-axiom', {
    body: { run_id: nextRun.id }
  });
  
  // Update retry count
  await supabase
    .from('pricing_runs')
    .update({ 
      retry_count: (nextRun.retry_count || 0) + 1,
      status: 'running'
    })
    .eq('id', nextRun.id);
}
```

### File 4: Cron Job Setup (via SQL)

```sql
SELECT cron.schedule(
  'process-pricing-queue',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url:='https://zpsvatonxakysnbqnfcc.supabase.co/functions/v1/process-pricing-queue',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);
```

---

## Expected Outcome

| Before | After |
|--------|-------|
| ~50% failure rate | ~95%+ success rate |
| Runs overlap and collide | Runs execute sequentially |
| Failed runs stay failed | Failed runs auto-retry up to 3x |
| Manual monitoring needed | Self-healing queue system |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Add `queued` status and retry columns |
| `supabase/functions/fetch-single-rate/index.ts` | Add locking check |
| `supabase/functions/process-pricing-queue/index.ts` | Create new queue processor |
| `supabase/config.toml` | Add config for new function |
| Cron job SQL | Schedule queue processor |

---

## Flow Diagram

```text
Cron triggers at 5:30 AM
         │
         ▼
  fetch-single-rate
         │
         ▼
   ┌─────────────────────┐
   │ Is another run      │
   │ currently 'running'?│
   └─────────────────────┘
         │
    ┌────┴────┐
   YES        NO
    │          │
    ▼          ▼
 Queue run   Trigger Axiom
 for retry   immediately
    │          │
    ▼          ▼
 Set status  Set status
 = 'queued'  = 'running'
    │          │
    └────┬─────┘
         │
         ▼
 process-pricing-queue
 (runs every 5 minutes)
         │
         ▼
 Process oldest queued run
 if no active run exists
```
