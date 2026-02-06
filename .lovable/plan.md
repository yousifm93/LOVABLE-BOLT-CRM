

# Shrink-Wrap Lead Information Card (Structural Fixes Only)

## Changes

### File 1: `src/components/ClientDetailDrawer.tsx`

**Line 2674** -- Add `items-start` to center column wrapper:
```
"space-y-4 overflow-y-auto flex flex-col"
-->
"space-y-4 overflow-y-auto flex flex-col items-start"
```

**Line 2677** -- Remove `flex-1 min-h-0`, use `w-full`:
```
"flex-1 min-h-0"
-->
"w-full"
```

### File 2: `src/components/lead-details/LeadCenterTabs.tsx`

**Line 38** -- Remove fixed viewport height, shrink-wrap:
```
"mb-4 h-[calc(100vh-400px)]"
-->
"mb-4 w-full"
```

**Line 42** -- Remove calculated height from CardContent:
```
"h-[calc(100%-80px)]"
-->
""  (no className needed, or just remove the prop)
```

**Line 43** -- Remove `h-full` from Tabs:
```
"w-full h-full"
-->
"w-full"
```

**Lines 77, 90, 94, 104, 119** -- Remove `h-[calc(100%-56px)]` from all TabsContent elements. Keep `overflow-hidden`/`overflow-auto` as-is:
```
Line 77:  "mt-0 h-[calc(100%-56px)] overflow-hidden"  -->  "mt-0 overflow-hidden"
Line 90:  "mt-0 h-[calc(100%-56px)] overflow-auto"    -->  "mt-0 overflow-auto"
Line 94:  "mt-0 h-[calc(100%-56px)] overflow-auto"    -->  "mt-0 overflow-auto"
Line 104: "mt-0 h-[calc(100%-56px)] overflow-auto"    -->  "mt-0 overflow-auto"
Line 119: "mt-0 h-[calc(100%-56px)] overflow-auto"    -->  "mt-0 overflow-auto"
```

## Result

The Card sizes itself to its content. The center column container (`overflow-y-auto`) handles scrolling if content exceeds the viewport. No magic-number height caps are introduced.
