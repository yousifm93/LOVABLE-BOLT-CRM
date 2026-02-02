

# Plan: Conditions Tab, Search Bar, Disclose Task Validation & Layout Changes

## Summary

This plan addresses 5 main requests:
1. **Conditions Tab columns**: Reorder columns and add "Created On" column
2. **Disclose Task validation**: Require disclosure file + status = "Sent" before completion
3. **Search bar width**: Fix the search dropdown being cut off
4. **Layout changes**: Remove "Pipeline Review" from early stages, add "Latest File Update" section
5. **Pre-Qualified/Pre-Approved layout**: Rearrange "About the Borrower" placement

---

## 1. Conditions Tab Column Reordering

### Current Column Order:
`#` | `Condition` | `Status` | `ETA` | `From` | `Last Updated` | `Doc` | `Trash`

### New Column Order:
`#` | `Condition` | `Status` | `Doc` | `Created On` | `Trash` | `From` | `ETA` | `Last Updated`

Wait - based on your description, you want:
- Move "Last Updated" between "ETA" and "From" 
- Add "Created On" after "Doc" column
- Trash icon stays at the end

### Final Column Order:
`#` | `Condition` | `Status` | `ETA` | `Last Updated` | `From` | `Doc` | `Created On` | `Trash`

### File: `src/components/lead-details/ConditionsTab.tsx`

**Changes:**
1. Reorder TableHead elements (lines 633-662)
2. Reorder TableCell elements to match (lines 680-817)
3. Add "Created On" column with hover tooltip showing date/time and creator name

**New "Created On" column implementation:**
```typescript
<TableHead className="w-[85px] text-center text-xs">Created On</TableHead>

// In TableBody:
<TableCell className="py-0.5 px-1">
  <Popover>
    <PopoverTrigger asChild>
      <div className="flex items-center gap-1.5 cursor-pointer hover:opacity-80">
        <Avatar className="h-5 w-5">
          <AvatarFallback className="text-[10px] bg-muted">
            {getUserInitials(condition.created_by)}
          </AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground">
          {formatDistance(new Date(condition.created_at), new Date(), { addSuffix: true })}
        </span>
      </div>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-2 text-xs" align="center">
      <div className="font-medium">Created by {getUserName(condition.created_by)}</div>
      <div className="text-muted-foreground">{format(new Date(condition.created_at), 'MMM d, yyyy h:mm a')}</div>
    </PopoverContent>
  </Popover>
</TableCell>
```

---

## 2. Disclose Task Validation

When completing a task titled "Disclose", require:
1. `disc_file` field is populated (disclosure document uploaded)
2. `disclosure_status` = "Sent"

### File: `src/services/taskCompletionValidation.ts`

**Add new validation for "Disclose" task:**
```typescript
// Check for disclosure requirements (for "Disclose" task)
if (task.title?.toLowerCase().includes('disclose')) {
  const borrowerId = task.borrower_id;
  if (borrowerId) {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('disc_file, disclosure_status')
      .eq('id', borrowerId)
      .single();

    if (error || !lead) {
      return { canComplete: true }; // Allow if lead not found
    }

    // Check if disclosure file is uploaded
    if (!lead.disc_file) {
      return {
        canComplete: false,
        message: 'You must upload a Disclosure document before completing this task',
        missingRequirement: 'disc_file_required',
      };
    }

    // Check if disclosure status is "Sent"
    if (lead.disclosure_status !== 'Sent') {
      return {
        canComplete: false,
        message: 'Disclosure status must be "Sent" before completing this task',
        missingRequirement: 'disclosure_status_sent',
      };
    }
  }
}
```

---

## 3. Search Bar Width Fix

The search dropdown is being cut off on the right side.

### File: `src/components/AppSidebar.tsx`

**Current issue (line 456):**
```typescript
<div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[300px] overflow-hidden">
```

**Fix:**
- Increase minimum width
- Allow overflow on the right side

```typescript
<div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 max-h-[300px] overflow-hidden min-w-[280px] w-max">
```

This ensures the dropdown expands to fit content rather than being constrained by the parent width.

---

## 4. Layout Changes - Remove Pipeline Review, Add Latest File Update

### Stages Affected:
| Stage | Current Layout | New Layout |
|-------|---------------|------------|
| **Leads** | About Borrower + Pipeline Review + Chat | About Borrower + **Latest File Update** + Chat |
| **Pending App** | About Borrower + Pipeline Review + Chat | About Borrower + **Latest File Update** + Chat |
| **Screening** | About Borrower + DTI/PITI + (Pipeline Review in right column) | About Borrower + **Latest File Update** + DTI/PITI |
| **Pre-Qualified** | Pipeline Review + DTI/PITI + (About Borrower at bottom) | **About Borrower** + DTI/PITI + **Latest File Update** (at bottom) |
| **Pre-Approved** | Same as Pre-Qualified | Same as Pre-Qualified |
| **Active** | Keep current (Pipeline Review stays) | No changes |
| **Past Clients** | Keep current | No changes |

### File: `src/components/ClientDetailDrawer.tsx`

**Changes:**

1. **Remove Pipeline Review from Leads/Pending App** (lines 2080-2145)
   - Delete the Pipeline Review card for these stages
   - Add "Latest File Update" section after "About the Borrower"

2. **Screening layout** (left column)
   - Keep "About the Borrower" at top
   - Add "Latest File Update" after About the Borrower
   - Keep DTI/Address/PITI below

3. **Remove Pipeline Review from right column for Screening** (lines 3021-3076)
   - Delete the Pipeline Review section for Screening stage

4. **Pre-Qualified/Pre-Approved layout** (left column, lines 2257-2340)
   - Move "About the Borrower" to where Pipeline Review was (top of left column)
   - Add "Latest File Update" at bottom left (where About Borrower currently is)

### "Latest File Update" Section Component:
Similar to "About the Borrower" but uses `latest_file_updates` field:
```typescript
<Card>
  <CardHeader className="pb-3 bg-white">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-bold">Latest File Update</CardTitle>
      {!isEditingFileUpdates && localFileUpdates && (
        <Button variant="ghost" size="sm" onClick={() => setIsEditingFileUpdates(true)} className="h-7 text-xs">
          Edit
        </Button>
      )}
    </div>
  </CardHeader>
  <CardContent className="bg-gray-50">
    {isEditingFileUpdates || !localFileUpdates ? (
      <Textarea 
        value={localFileUpdates} 
        onChange={e => {
          setLocalFileUpdates(e.target.value);
          setHasUnsavedFileUpdates(true);
        }} 
        placeholder="Enter the latest update on this file..." 
        className="min-h-[100px] resize-none bg-white mb-2" 
      />
      // Save/Cancel buttons when editing
    ) : (
      <div className="bg-white rounded-md p-3 text-sm border cursor-pointer" onClick={() => setIsEditingFileUpdates(true)}>
        <FileUpdatesDisplay content={localFileUpdates} />
      </div>
    )}
    {/* Timestamp: Last updated + by who */}
    {(client as any).latest_file_updates_updated_at && (
      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
        Last updated: {format(new Date(...), 'MMM dd, yyyy h:mm a')} by {userName}
      </div>
    )}
  </CardContent>
</Card>
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lead-details/ConditionsTab.tsx` | Reorder columns, add "Created On" column |
| `src/services/taskCompletionValidation.ts` | Add "Disclose" task validation |
| `src/components/AppSidebar.tsx` | Fix search dropdown width |
| `src/components/ClientDetailDrawer.tsx` | Layout changes for Leads/Pending App/Screening/Pre-Qual/Pre-Approved |

---

## Visual Summary

### Conditions Tab (After)
```
#  | Condition | Status | ETA | Last Updated | From | Doc | Created On | 🗑
```

### Leads/Pending App Layout (After)
```
Left Column:
├── About the Borrower
├── Latest File Update ✨ NEW
└── Chat with Borrower

Right Column:
├── Lead Information
├── Stage History
├── Quick Actions
└── Third Party Items
```

### Screening Layout (After)
```
Left Column:
├── About the Borrower
├── Latest File Update ✨ NEW
└── DTI / Address / PITI

Right Column:
├── Lead Information
├── Stage History
├── Quick Actions
└── Third Party Items
(Pipeline Review REMOVED)
```

### Pre-Qualified/Pre-Approved Layout (After)
```
Left Column:
├── About the Borrower (moved up from bottom)
├── DTI / Address / PITI
└── Latest File Update ✨ NEW (at bottom)

Right Column:
├── Lead Information
├── Stage History
├── Send Email Templates
├── Quick Actions
└── Third Party Items
(Pipeline Review REMOVED)
```

