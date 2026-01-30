

# Plan: Add "On Hold" Button to Lead Details

## Summary

Add an "On Hold" button between "Mark as Closed" and "Idle" in the Loan & Property tab. When clicked, this button will move the lead from Incoming or Live to the On Hold section within the Active pipeline.

---

## How It Works

The Active pipeline uses the `pipeline_section` field to categorize leads:
- **Incoming** = `pipeline_section: 'Incoming'` or `null`
- **Live** = `pipeline_section: 'Live'`
- **On Hold** = `pipeline_section: 'On Hold'`

The new button will:
1. Show a confirmation dialog asking if you want to put the lead on hold
2. When confirmed, update `pipeline_section` to `'On Hold'`
3. Show a success toast
4. Refresh the drawer to reflect the change

---

## Technical Changes

### File: `src/components/lead-details/DetailsTab.tsx`

**1. Add new state variable for loading state** (around line 93):
```typescript
const [isMovingToOnHold, setIsMovingToOnHold] = useState(false);
```

**2. Add "On Hold" button with AlertDialog** (between "Mark as Closed" button and "Idle" button, around line 2007):

The button order will be:
1. Delete Lead (red)
2. Back to Pre-Approved (secondary)  
3. **On Hold** (new - outline style with pause icon)
4. Idle (outline)
5. Mark as Closed (yellow)

```typescript
{/* On Hold button - only show when in Active stage */}
{client.pipeline_stage_id === ACTIVE_STAGE_ID && (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button 
        variant="outline"
        disabled={isMovingToOnHold}
      >
        <Pause className="h-4 w-4 mr-1" />
        {isMovingToOnHold ? "Moving..." : "On Hold"}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Put Lead On Hold?</AlertDialogTitle>
        <AlertDialogDescription>
          This will move the lead to the On Hold section of the Active pipeline.
          The lead can be moved back to Incoming or Live later.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleMoveToOnHold}>
          Move to On Hold
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

**3. Add handler function** (after `handleCloseLoan` around line 550):
```typescript
const handleMoveToOnHold = async () => {
  if (!leadId) return;
  setIsMovingToOnHold(true);
  try {
    const { error } = await supabase
      .from('leads')
      .update({ pipeline_section: 'On Hold' })
      .eq('id', leadId);
    
    if (error) throw error;
    
    toast({
      title: "Success",
      description: "Lead moved to On Hold",
    });
    
    if (onLeadUpdated) onLeadUpdated();
  } catch (error) {
    console.error("Error moving lead to on hold:", error);
    toast({
      title: "Error",
      description: "Failed to move lead to On Hold",
      variant: "destructive",
    });
  } finally {
    setIsMovingToOnHold(false);
  }
};
```

**4. Add Pause icon import** (at top of file with other lucide imports):
```typescript
import { Pause } from "lucide-react";
```

---

## Button Order After Change

| Button | Style | Condition |
|--------|-------|-----------|
| Delete Lead | Destructive (red) | Always visible |
| Back to Pre-Approved | Secondary | Only when in Active stage |
| **On Hold** | Outline | Only when in Active stage |
| Idle | Outline | Always visible |
| Mark as Closed | Yellow | Always visible |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/lead-details/DetailsTab.tsx` | Add state, handler, icon import, and button with dialog |

---

## Result

When viewing a lead in the Active pipeline:
- A new "On Hold" button appears between "Mark as Closed" and "Idle"
- Clicking it shows a confirmation dialog
- Confirming moves the lead to the "On Hold" section on the Active board
- The lead can later be moved back by changing `loan_status` or manually updating `pipeline_section`

