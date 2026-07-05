# Music Sheet Viewer — Product Context

This document describes the full planned scope of the app beyond the current
prototype. The prototype covers the viewer only. Use this as a reference when
making architectural decisions so that future features can be layered on without
structural rework.

---

## What the App Is

A personal PWA for viewing PDF music sheets on a tablet. The primary interaction
is reading sheet music during practice — the viewer must be distraction-free and
reliable. Organization is a secondary concern handled in a separate screen.

---

## Two-Screen Architecture

```
Viewer (/viewer)
    ↓ edit sequence
Sequence Editor (/editor)
```

Both screens are part of the same PWA and share a single data layer. Vue Router
will manage navigation between them. The current prototype covers the Viewer only.
The Sequence Editor is planned next.

---

## Screen 1 — Viewer (current prototype)

The full-screen PDF reader. Minimal UI, optimized for reading during practice.

**Current behaviors to preserve:**
- Tap left 15% of screen to turn pages — top 30% = previous, bottom 70% = next
- Top bar: Open button, dynamic page strip, total page count
- Page strip shows a window of page number buttons centered on the current page;
  window size is calculated dynamically from actual pixel width of the strip element
- Tap zones and strip only appear after a file is loaded
- Canvas scaled to devicePixelRatio
- Keyboard arrow navigation
- Pending page queuing (rapid taps handled gracefully)

**Planned additions to the Viewer:**
- Mode toggle in the top bar: Normal mode vs Sequence mode (see Sequences below)
- When in Sequence mode, the strip shows the sequence steps in order as page
  number labels; the active step is highlighted by position, not by page number
  (since the same page number can appear multiple times in a sequence)
- External input device support: page turner pedals and remotes pair as Bluetooth
  keyboards and send standard key events — the existing keyboard listener already
  covers this. A key binding settings screen (future) will let users remap keys.

---

## Screen 2 — Sequence Editor (planned)

A dedicated screen for building and managing custom page sequences for a file.

**Concept:**
- Each file can have zero or more named sequences (e.g. "with repeats", "no repeats")
- A sequence is an ordered list of page number steps, e.g. `[1, 2, 3, 4, 1, 2, 4, 5]`
  representing how pages should be navigated during performance
- The editor shows small page thumbnails (rendered via PDF.js at low scale) as a
  source palette, and a reorderable sequence builder below
- Interaction: tap a thumbnail to append it to the sequence; drag and drop to reorder

---

## Sequences — Detailed Behavior

### Default sequence

Every file entry in metadata is created with a default sequence auto-generated
from its total page count. For a three-page file:

```json
"sequences": [
  { "default": true, "name": "default", "steps": [1, 2, 3] }
]
```

Rules for the default sequence:
- Created automatically when a file is first opened and its entry is written to metadata
- `default: true` marks it as the default sequence; all other sequences have `default: false`
- The default sequence has `name: "default"`; all other sequences need the user's input in the Sequence Editor
- The default sequence cannot be removed or modified by the user in the Sequence Editor
- The default sequence is used exclusively for **normal mode** navigation
- In **sequence mode**, only non-default sequences are used:
  ```javascript
  const sequenceModeOptions = file.sequences.filter(s => !s.default)
  ```
- If `sequenceModeOptions` is empty, the mode toggle is disabled for that file

### Normal mode

Navigation follows the default sequence steps linearly (1, 2, 3...). The strip
shows standard page numbers. This is always the active mode on first open.

### Sequence mode

Navigation follows a chosen non-default sequence's steps array. The strip shows
all steps in order as page number labels. The active step is tracked by index
internally — not by page number — because the same page can appear at multiple steps.

### Activating sequence mode

- If `sequenceModeOptions` has one entry → activate it immediately
- If `sequenceModeOptions` has multiple entries → show a picker first
- Resume from the first step whose page number matches the current page in normal
  mode (first occurrence match)

### Switching back to normal mode

- Take the current actual page number from the active sequence step
- Switch to normal mode showing that page
- Strip reflects normal linear order around that page

### Direct step navigation

- Tapping a strip button in sequence mode jumps the cursor to that step
- Subsequent next/prev taps continue from that step position in the sequence

---

## Data Layer

### Persistence strategy

Two complementary layers:

| Layer | Role |
|---|---|
| IndexedDB (via Dexie.js) | Runtime working layer — fast queries and lookups |
| `metadata.json` (File System Access API) | Source of truth — lives in the user's filesystem |

On every meaningful change: update IndexedDB, then flush to `metadata.json`.
On app launch: read `metadata.json` into IndexedDB.

### First launch flow

1. Check if a `metadata.json` file handle is stored in IndexedDB
2. If not → ask the user: import an existing file, or create a new one
3. Store the file handle using `shallowRef` / outside Vue reactivity

### First open of a new PDF file

1. Read the last 4KB of the file and compute a compound hash key:
   ```javascript
   const tail = await file.slice(-4096).arrayBuffer()
   const hashBuffer = await crypto.subtle.digest('SHA-256', tail)
   const key = `${hashHex}-${file.size}`
   ```
2. Look up the key in IndexedDB
3. If found → load existing metadata (sequences, etc.) for that file
4. If not found → create a new entry with `nameHint` and a default sequence
   auto-generated from `totalPages`:
   ```javascript
   {
     key,
     nameHint: file.name,
     sequences: [
       { default: true, name: 'default', steps: Array.from({ length: totalPages }, (_, i) => i + 1) }
     ]
   }
   ```
5. Flush to `metadata.json`

### Metadata export/import

The `metadata.json` file is human-readable and fully portable. It can be copied
to another device and imported to transfer sequences. File identity is matched
by the compound hash key on import.

### Metadata schema

```json
{
  "version": 1,
  "files": [
    {
      "key": "<sha256-of-last-4kb>-<filesize>",
      "nameHint": "moonlight-sonata.pdf",
      "sequences": [
        { "default": true, "name": "default", "steps": [1, 2, 3, 4, 5] },
        { "default": false, "name": "natural flow", "steps": [1, 2, 3, 4, 1, 2, 4, 5] }
      ]
    }
  ]
}
```

`nameHint` is not used as a key — it is stored only for human readability in the
exported file and as a display fallback in the UI.

---

## PWA Requirements

- Hosted on GitHub Pages (HTTPS)
- Service worker caches all app assets on install
- Fully offline after first install; PDF.js is bundled via npm, not loaded from CDN
- `navigator.storage.persist()` requested on first launch for iOS durability
- PDF files themselves are loaded from the device filesystem, not the network

---

## Platform Notes

- **Primary target:** Android tablet with Chrome
- **Secondary target:** iPad with Safari
- iOS Safari may evict Service Worker cache and IndexedDB after weeks of inactivity
  — the `metadata.json` file approach mitigates data loss; the app should gracefully
  detect and report when PDF.js needs to be re-fetched
- File System Access API write-back (silent flush to `metadata.json`) works on
  Chrome/Android; on iOS it may require a manual Export button fallback
- External page turner devices pair as Bluetooth keyboards — no special API needed