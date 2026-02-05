
# Add Website Feedback Category with Priority Level

## Overview

Enhance the feedback system with:
1. **New "Website" category** at the top of the category dropdown
2. **Feedback Level selector (1, 2, or 3)** shown only when "Website" is selected
3. **New "Website Feedback" section** in the admin review page (5th bucket) that displays all website feedback with the level number

---

## Changes Required

### 1. Update Feedback Submission Page (`src/pages/Feedback.tsx`)

**A. Add "Website" category at the top of the list:**
```typescript
const feedbackCategories = [
  { key: 'website', label: 'Website' },  // NEW - at the top
  { key: 'dashboard', label: 'Dashboard' },
  // ... rest unchanged
];
```

**B. Add new state for feedback level:**
```typescript
const [feedbackLevel, setFeedbackLevel] = useState<number | null>(null);
```

**C. Add Level selector in the dialog (shown only when "website" category is selected):**
- Position: After the feedback textarea, before the screenshot upload
- Label: "Website Feedback Level"
- Options: Three buttons (1, 2, 3) where:
  - 1 = Low priority
  - 2 = Medium priority  
  - 3 = High priority / Most extreme
- Visual: Buttons that highlight when selected

**D. Update the `feedbackItem` structure to include level:**
```typescript
const feedbackItem: FeedbackItemContent = {
  text: newFeedbackText.trim(),
  image_url: newFeedbackImage,
  level: newCategory === 'website' ? feedbackLevel : undefined  // Only for website feedback
};
```

**E. Reset level when dialog closes or category changes away from "website"**

---

### 2. Update Feedback Review Page (`src/pages/admin/FeedbackReview.tsx`)

**A. Add new state for Website Feedback bucket:**
```typescript
const [websiteBucketOpen, setWebsiteBucketOpen] = useState(false);
```

**B. Update the interface to include level:**
```typescript
interface FeedbackItemContent {
  text: string;
  image_url?: string;
  level?: number;  // NEW - 1, 2, or 3
}
```

**C. Update `getAggregatedItems` to also collect website items:**
```typescript
const websiteItems: Array<{ fb: FeedbackItem; item: FeedbackItemContent | string; index: number; status: string }> = [];

// In the forEach loop:
if (fb.section_key === 'website') {
  websiteItems.push({ fb, item, index, status });
}
```

**D. Add 5th collapsible section for Website Feedback:**
- Icon: Globe icon (from lucide-react)
- Border color: Cyan/teal theme
- Display: Show each item with its level badge prominently (e.g., "Level 3" in red for high priority)
- Sorting: Items with higher levels shown first

**E. Display level in the feedback item:**
```typescript
// In renderFeedbackItem or dedicated renderer:
{itemLevel && (
  <Badge className={
    itemLevel === 3 ? 'bg-red-500 text-white' :
    itemLevel === 2 ? 'bg-yellow-500 text-white' :
    'bg-blue-500 text-white'
  }>
    Level {itemLevel}
  </Badge>
)}
```

---

## UI Preview

### Feedback Submission Dialog (when "Website" selected):

```text
┌─────────────────────────────────────────────────────┐
│  Submit New Feedback                                │
│  Select a category and describe...                  │
├─────────────────────────────────────────────────────┤
│  Category                                           │
│  [Website ▼]                                        │
│                                                     │
│  Your Feedback                                      │
│  ┌─────────────────────────────────────────────┐   │
│  │ Describe what you'd like to see...          │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Website Feedback Level                             │
│  [1]  [2]  [3]                                     │
│  Low  Medium  High                                  │
│                                                     │
│  Screenshot (optional)                              │
│  [Attach Screenshot]                                │
│                                                     │
│  [Cancel]                    [Submit]               │
└─────────────────────────────────────────────────────┘
```

### Admin Review Page (new 5th section):

```text
┌─────────────────────────────────────────────────────┐
│ ▶ Website Feedback                          [3]    │
├─────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐   │
│  │ [Website] [Level 3]            Feb 5       │   │
│  │ The homepage loading is slow on mobile...  │   │
│  │ [Screenshot]                               │   │
│  │                                            │   │
│  │ [Complete] [Still Need Help] [Idea] [...]  │   │
│  │ [Add a response...]                        │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ [Website] [Level 1]            Feb 4       │   │
│  │ Consider adding a dark mode toggle...      │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/pages/Feedback.tsx` | Add "Website" category at top, add level selector UI, include level in submitted data |
| `src/pages/admin/FeedbackReview.tsx` | Add Website Feedback bucket (5th section), display level badges, sort by level |

---

## Technical Details

### Updated FeedbackItemContent Interface (both files):
```typescript
interface FeedbackItemContent {
  text: string;
  image_url?: string;
  level?: number;  // 1 = Low, 2 = Medium, 3 = High (website feedback only)
}
```

### Level Badge Colors:
- Level 1: Blue background (`bg-blue-500`)
- Level 2: Yellow/Amber background (`bg-yellow-500`)
- Level 3: Red background (`bg-red-500`)

### Website Bucket Logic:
- Website items are shown in their own dedicated section regardless of status
- They can still have status buttons (Complete, Needs Help, Idea, Pending Review)
- Sorted by level descending (Level 3 items first)

---

## No Database Changes Required

The `feedback_items` column is already JSONB, so adding a `level` property to the stored objects requires no schema migration.
