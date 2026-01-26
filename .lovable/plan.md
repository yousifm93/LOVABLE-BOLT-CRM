

## Plan: Add Duplicate Detection to Dashboard "All Pipeline Leads"

### Overview
This feature will help identify potential duplicate leads in the pipeline by detecting matching first+last name, phone, OR email. Past Clients are excluded from duplicate detection since they're repeat customers.

---

### Feature Requirements

1. **Duplicate Badge Counter**: Add a clickable badge next to "All Pipeline Leads (962)" showing the number of potential duplicates
2. **Duplicate Indicator Column**: Add a "Potential Duplicate" column near "About the Borrower" / "Pipeline Review" columns showing Yes/No
3. **Filter to Duplicates**: Clicking the badge filters the list to show only potential duplicates
4. **Exclusion Rule**: Past Clients stage (`acdfc6ba-7cbc-47af-a8c6-380d77aef6dd`) is excluded from duplicate detection

---

### Technical Implementation

#### 1. Update Data Fetching (useDashboardData.tsx)

Modify the `allPipelineLeads` query to:
- Fetch additional fields: `email`, `phone` for duplicate detection
- **Exclude Past Clients** from the query entirely (they're closed loans, not pipeline)

```typescript
// Updated query
const { data: allPipelineLeads } = useQuery({
  queryKey: ['allPipelineLeads'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        id, first_name, last_name, lead_on_date, created_at,
        pipeline_stage_id, notes, latest_file_updates,
        email, phone,  // Added for duplicate detection
        pipeline_stages!inner(name)
      `)
      .is('deleted_at', null)
      .neq('pipeline_stage_id', 'acdfc6ba-7cbc-47af-a8c6-380d77aef6dd')  // Exclude Past Clients
      .order('created_at', { ascending: false });
    // ...
  },
});
```

#### 2. Duplicate Detection Logic (DashboardTabs.tsx)

Add a function to compute duplicates based on:
- **Full name match**: `first_name + last_name` (case-insensitive)
- **Phone match**: Same phone number (normalized)
- **Email match**: Same email address (case-insensitive)

```typescript
// Compute duplicate groups
const duplicateAnalysis = useMemo(() => {
  if (!allPipelineLeads) return { duplicateIds: new Set(), duplicateCount: 0 };
  
  const nameMap = new Map<string, string[]>();
  const emailMap = new Map<string, string[]>();
  const phoneMap = new Map<string, string[]>();
  
  allPipelineLeads.forEach((lead) => {
    // Name key (case-insensitive)
    const nameKey = `${(lead.first_name || '').toLowerCase().trim()} ${(lead.last_name || '').toLowerCase().trim()}`;
    if (nameKey.trim()) {
      nameMap.set(nameKey, [...(nameMap.get(nameKey) || []), lead.id]);
    }
    
    // Email key
    const emailKey = (lead.email || '').toLowerCase().trim();
    if (emailKey) {
      emailMap.set(emailKey, [...(emailMap.get(emailKey) || []), lead.id]);
    }
    
    // Phone key (normalized - digits only)
    const phoneKey = (lead.phone || '').replace(/\D/g, '');
    if (phoneKey.length >= 10) {
      phoneMap.set(phoneKey, [...(phoneMap.get(phoneKey) || []), lead.id]);
    }
  });
  
  // Collect all IDs that appear in any duplicate group
  const duplicateIds = new Set<string>();
  [nameMap, emailMap, phoneMap].forEach(map => {
    map.forEach(ids => {
      if (ids.length > 1) {
        ids.forEach(id => duplicateIds.add(id));
      }
    });
  });
  
  return { duplicateIds, duplicateCount: duplicateIds.size };
}, [allPipelineLeads]);
```

#### 3. UI Changes (DashboardTabs.tsx)

**A. Header with Duplicate Badge**

```typescript
<CardTitle className="text-lg font-semibold flex items-center gap-2">
  All Pipeline Leads ({allLeadsData.length})
  {duplicateAnalysis.duplicateCount > 0 && (
    <Badge 
      variant="destructive" 
      className="cursor-pointer"
      onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
    >
      {duplicateAnalysis.duplicateCount} potential duplicates
    </Badge>
  )}
  {selectedAllLeadIds.length > 0 && (
    <Badge variant="secondary" className="ml-2">
      {selectedAllLeadIds.length} selected
    </Badge>
  )}
</CardTitle>
```

**B. New Column: "Potential Duplicate"**

Add a column after "About the Borrower":

```typescript
{
  accessorKey: 'isPotentialDuplicate',
  header: 'Duplicate?',
  cell: ({ row }) => {
    const isDuplicate = duplicateAnalysis.duplicateIds.has(row.original.id);
    return isDuplicate ? (
      <Badge variant="destructive" className="text-xs">Yes</Badge>
    ) : (
      <span className="text-muted-foreground">—</span>
    );
  },
  className: "w-24",
}
```

**C. Filter Logic**

```typescript
// Add state for duplicate filter
const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

// Filter data when showing duplicates only
const filteredAllLeadsData = useMemo(() => {
  if (!showDuplicatesOnly) return allLeadsData;
  return allLeadsData.filter(lead => duplicateAnalysis.duplicateIds.has(lead.id));
}, [allLeadsData, showDuplicatesOnly, duplicateAnalysis]);
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useDashboardData.tsx` | Add email/phone to query, exclude Past Clients from allPipelineLeads |
| `src/pages/DashboardTabs.tsx` | Add duplicate detection logic, badge counter, filter toggle, and new column |

---

### Column Order After Changes

1. Checkbox
2. # (row number)
3. Borrower Name
4. Lead Created On
5. Current Stage
6. About the Borrower
7. **Duplicate?** (new)
8. Pipeline Review
9. Actions (if exists)

---

### User Experience

1. User visits Dashboard → All tab
2. Sees "All Pipeline Leads (962)" with red badge "5 potential duplicates" (example)
3. **Clicking the badge** toggles filter to show only duplicates
4. "Duplicate?" column shows "Yes" badge for each potential duplicate
5. User can click borrower name to open drawer and review/delete duplicates

---

### Duplicate Detection Rules

A lead is marked as a potential duplicate if **any** of these match another lead:
- Same first + last name (case-insensitive)
- Same email address (case-insensitive)
- Same phone number (normalized to digits)

**Excluded**: Leads in the Past Clients stage are never checked or marked as duplicates.

