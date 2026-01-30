
# Plan: Fix @ Mention Dropdown Positioning

## Summary

The mention dropdown currently appears far below the text editor instead of directly under the `@` symbol where the user is typing. This is because the popover is anchored to the entire editor wrapper div, not to the text cursor position.

## Root Cause Analysis

The current implementation in `mentionable-rich-text-editor.tsx`:
- Uses Radix UI's `Popover` with `PopoverAnchor` wrapping the entire editor
- This causes the dropdown to appear at the bottom of the editor container
- When inside a modal with scrollable content, this creates a confusing experience

```tsx
<Popover open={showMentionPopover}>
  <PopoverAnchor asChild>
    <div>
      <RichTextEditor ... />  // The ENTIRE editor is the anchor
    </div>
  </PopoverAnchor>
  <PopoverContent side="bottom">  // Appears below the whole editor
    ...
  </PopoverContent>
</Popover>
```

## Solution

Refactor to use an **inline absolute positioned dropdown** that appears within the editor's visible area, just below the toolbar. Since TipTap doesn't easily expose caret coordinates, we'll:

1. Remove the Popover component entirely
2. Use an absolutely positioned div that appears at a fixed position within the editor
3. Position it just below the toolbar area where text starts
4. Ensure high z-index for modal contexts

## Technical Changes

### File: `src/components/ui/mentionable-rich-text-editor.tsx`

Replace the Popover-based approach with inline positioning:

```tsx
<div ref={editorRef} className="relative">
  <RichTextEditor
    value={value}
    onChange={handleContentChange}
    placeholder={placeholder}
  />
  
  {/* Mention dropdown - positioned below toolbar area */}
  {showMentionPopover && (
    <div 
      className="absolute left-2 z-[9999] w-64 bg-popover border rounded-md shadow-lg"
      style={{ top: '50px' }}  // Below toolbar (roughly 44px)
    >
      <Command>
        <CommandList>
          <CommandEmpty>No team members found.</CommandEmpty>
          <CommandGroup heading="Team Members">
            {filteredMembers.slice(0, 5).map((member) => (
              <CommandItem ...>
                ...
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  )}
</div>
```

### Key Changes:
1. Remove `Popover`, `PopoverContent`, `PopoverAnchor` imports
2. Use a simple absolutely positioned div within the relative container
3. Position `top: '50px'` to appear just below the editor toolbar
4. Keep `z-[9999]` for modal stacking
5. Add solid background color `bg-popover` to ensure visibility

---

## Notification Badge Investigation

The notification badge system IS working correctly. The issue is:

- The logged-in user (yousifminc@gmail.com, ID: `08e73d69...`) 
- Tagged "Yousif Mohamed" (yousif@mortgagebolt.org, ID: `230ccf6d...`)
- These are **two different users** with the same name

So the badge correctly doesn't show for the logged-in user because they weren't actually tagged - they tagged a different account.

When Ashley Merizio logs in (ID: `3dca68fc...`), she WILL see the badge with 2 unread mentions.

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ui/mentionable-rich-text-editor.tsx` | Replace Popover with inline absolute positioned dropdown |

---

## Expected Results

1. **Dropdown Position**: The team member list will appear just below the editor toolbar, close to where users are typing
2. **Works in Modals**: The high z-index ensures it appears above modal layers
3. **Consistent Experience**: Same positioning regardless of scroll position or editor content length
