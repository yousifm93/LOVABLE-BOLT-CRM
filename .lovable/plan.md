

## Plan: Display Attached Images in Note Details Modal

### Problem

Images can be added to notes and are stored in the database, but when viewing a note in the "Note Details" modal, the attached image is not displayed. The screenshot shows the modal only shows "test note" text with no image visible below it.

### Root Cause

The `NoteDetailModal` component in `src/components/modals/NoteDetailModal.tsx`:
1. The `note` prop interface (lines 16-24) only includes: `id`, `type`, `title`, `description`, `timestamp`, `user`, `author_id` - it does NOT include `attachment_url`
2. Even though `selectedNote` passed from `ActivityTab` is a full `Activity` object that has `attachment_url`, the TypeScript interface doesn't recognize it
3. There is no rendering code to display the image in the modal

### Solution

Update `NoteDetailModal.tsx` to:
1. Add `attachment_url?: string` to the note interface
2. Render the image below the note content when `attachment_url` exists

### File to Modify

`src/components/modals/NoteDetailModal.tsx`

### Code Changes

**1. Update the interface (around line 16-24):**

```typescript
interface NoteDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: {
    id: string | number;
    type?: string;
    title: string;
    description?: string;
    timestamp: string;
    user?: string;
    author_id?: string;
    attachment_url?: string;  // ADD THIS LINE
  } | null;
  onActivityUpdated?: () => void;
}
```

**2. Add image rendering after the ScrollArea (around line 182-183):**

After the ScrollArea that shows the note content, add:

```tsx
{/* Display attachment if present */}
{note.attachment_url && (
  <div className="mt-4 border rounded-lg p-2">
    <p className="text-xs text-muted-foreground mb-2">Attachment:</p>
    <a href={note.attachment_url} target="_blank" rel="noopener noreferrer">
      <img 
        src={note.attachment_url} 
        alt="Note attachment" 
        className="max-h-64 rounded-md cursor-pointer hover:opacity-80 transition-opacity"
      />
    </a>
  </div>
)}
```

### Expected Outcome

When viewing a note that has an attached image:
- The note text will display as before
- Below the note content, a section labeled "Attachment:" will appear
- The attached image will be displayed (max height 256px)
- Clicking the image opens it in a new tab at full size

