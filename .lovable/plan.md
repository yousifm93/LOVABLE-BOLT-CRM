

# Pipeline Review: Mic Button + Minimal View with History Popup

## Overview
Redesign the Pipeline Review section to be a minimal header with a microphone button. No text/notes visible inline. Clicking "Pipeline Review" opens a dialog showing historical review data.

## Changes

### File: `src/components/ClientDetailDrawer.tsx`

**1. Replace the Pipeline Review Card content (lines ~2595-2630)**

Replace the current Pipeline Review section (which shows `MentionableInlineEditNotes` with text, metadata footer, and gray background) with a minimal card containing:
- "Pipeline Review" title on the left
- Mic button on the right that toggles recording (red pulsing when active, spinner when transcribing)
- Clicking the title text opens a dialog with the historical `latest_file_updates` content
- No text content visible inline

**2. Add Pipeline Review History Dialog**

Add a new state `showPipelineReviewHistory` and render a `Dialog` that:
- Shows the full `latest_file_updates` content in a scrollable read-only view
- Displays the timestamp and user metadata footer
- Opened when clicking "Pipeline Review" title

**3. Wire the Mic button to existing recording logic**

The recording functions already exist (`handleVoiceRecordingStart`, `handleVoiceRecordingStop`, `processVoiceRecording`). The mic button will:
- Call `handleVoiceRecordingStart()` on first click
- Call `handleVoiceRecordingStop()` on second click (turns red while recording)
- Show a `Loader2` spinner while `isSummarizingTranscript` is true
- After processing, the `VoiceUpdateConfirmationModal` opens automatically (existing behavior)

### Visual Layout

The Pipeline Review section will look like:
```
+------------------------------------------+
| Pipeline Review              [Mic Button] |
+------------------------------------------+
```

- Mic button: default gray, red pulsing when recording, spinner when processing
- "Pipeline Review" text is clickable to open the history dialog

## Technical Details

- New state: `const [showPipelineReviewHistory, setShowPipelineReviewHistory] = useState(false)`
- Mic button uses `isRecordingFileUpdates` state for red styling
- Uses `isSummarizingTranscript` state for spinner
- History dialog uses existing `Dialog` component
- All voice processing logic (transcribe, summarize, parse-field-updates) remains unchanged
