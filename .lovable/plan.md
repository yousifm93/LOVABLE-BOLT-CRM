

# Plan: Team Feedback Review - Four-Section Layout with All Collapsed

## Overview
Restructure the Team Feedback Review page to have four separate sections instead of two, with all sections collapsed by default when viewing.

---

## Summary of Changes

| Change | Description |
|--------|-------------|
| Default Collapsed | All sections start collapsed instead of Open Items being expanded |
| Four Sections | Split into: Open Items, Pending Review, Ideas, and Completed |
| Filtering Logic | Each section filters by specific status values |

---

## Current Structure
```
├── Open Items (pending, needs_help, idea, pending_user_review)
└── Completed (complete)
```

## New Structure
```
├── Open Items (pending, needs_help) - collapsed by default
├── Pending Review (pending_user_review) - collapsed by default
├── Ideas (idea) - collapsed by default  
└── Completed (complete) - collapsed by default
```

---

## Implementation Details

### 1. Update Default State for All Sections to Collapsed

**File:** `src/pages/admin/FeedbackReview.tsx`

Change the initial state values (around lines 66-67):

```typescript
// Change from:
const [openBucketOpen, setOpenBucketOpen] = useState(true);
const [completeBucketOpen, setCompleteBucketOpen] = useState(false);

// Change to:
const [openBucketOpen, setOpenBucketOpen] = useState(false);
const [pendingReviewBucketOpen, setPendingReviewBucketOpen] = useState(false);
const [ideasBucketOpen, setIdeasBucketOpen] = useState(false);
const [completeBucketOpen, setCompleteBucketOpen] = useState(false);
```

---

### 2. Update the `getAggregatedItems` Function

**File:** `src/pages/admin/FeedbackReview.tsx` (around lines 456-474)

Split items into four buckets instead of two:

```typescript
const getAggregatedItems = (userId: string) => {
  const userFeedback = getUserFeedback(userId);
  const openItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];
  const pendingReviewItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];
  const ideaItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];
  const completeItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];

  userFeedback.forEach(fb => {
    fb.feedback_items.forEach((item, index) => {
      const status = getItemStatus(fb.id, index);
      if (status === 'complete') {
        completeItems.push({ fb, item, index, status });
      } else if (status === 'pending_user_review') {
        pendingReviewItems.push({ fb, item, index, status });
      } else if (status === 'idea') {
        ideaItems.push({ fb, item, index, status });
      } else {
        // pending, needs_help go to Open Items
        openItems.push({ fb, item, index, status });
      }
    });
  });

  return { openItems, pendingReviewItems, ideaItems, completeItems };
};
```

---

### 3. Add Two New Section Collapsibles in the Render

**File:** `src/pages/admin/FeedbackReview.tsx` (around lines 511-580)

Add "Pending Review" and "Ideas" sections between Open Items and Completed:

**Section Order:**
1. **Open Items** - Orange icon, items with status `pending` or `needs_help`
2. **Pending Review** - Blue icon (Clock), items with status `pending_user_review`
3. **Ideas** - Purple icon (Lightbulb), items with status `idea`
4. **Completed** - Green icon (Check), items with status `complete`

**Pending Review Section:**
```typescript
{/* Pending Review Bucket */}
{pendingReviewItems.length > 0 && (
  <Collapsible open={pendingReviewBucketOpen} onOpenChange={setPendingReviewBucketOpen}>
    <Card className="border-blue-200 dark:border-blue-800">
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pendingReviewBucketOpen ? <ChevronDown /> : <ChevronRight />}
              <Clock className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-xl">Pending Review</CardTitle>
              <Badge variant="outline" className="ml-2 border-blue-500 text-blue-600">
                {pendingReviewItems.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent className="space-y-3">
          {pendingReviewItems.map(({ fb, item, index }) => 
            renderFeedbackItem(fb, item, index, false, false, true)
          )}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>
)}
```

**Ideas Section:**
```typescript
{/* Ideas Bucket */}
{ideaItems.length > 0 && (
  <Collapsible open={ideasBucketOpen} onOpenChange={setIdeasBucketOpen}>
    <Card className="border-purple-200 dark:border-purple-800">
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {ideasBucketOpen ? <ChevronDown /> : <ChevronRight />}
              <Lightbulb className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-xl">Ideas</CardTitle>
              <Badge variant="outline" className="ml-2 border-purple-500 text-purple-600">
                {ideaItems.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent className="space-y-3">
          {ideaItems.map(({ fb, item, index }) => 
            renderFeedbackItem(fb, item, index, false, true, false)
          )}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>
)}
```

---

## Visual Representation

```text
Team Feedback Review
├── [User Tab 1] [User Tab 2] ...
│
│   > Open Items (5)          ← Collapsed by default, orange icon
│   > Pending Review (3)      ← Collapsed by default, blue icon
│   > Ideas (2)               ← Collapsed by default, purple icon
│   > Completed (10)          ← Collapsed by default, green icon
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/FeedbackReview.tsx` | Add new state variables, update aggregation logic, add two new collapsible sections |

---

## Status Mapping

| Status Value | Goes To Section |
|--------------|-----------------|
| `pending` | Open Items |
| `needs_help` | Open Items |
| `pending_user_review` | Pending Review |
| `idea` | Ideas |
| `complete` | Completed |

