# Music Sheet Viewer — Product Context

This document describes the full planned scope of the app beyond the current
Vue port. Use this as a reference when making architectural decisions so that
future features can be layered on without structural rework.

---

## What the App Is

A personal Native Android App for viewing PDF music sheets on a tablet. The primary interaction
is reading sheet music during practice — the viewer must be distraction-free and
reliable. Sequence management and global settings are secondary concerns handled
in separate screens.

---

## Three-Screen Architecture

```
Viewer (/viewer)
    ↓ hamburger → Edit    → Sequence Editor (/editor)
    ↓ hamburger → Setting → Settings (/settings)
```

All three screens will be part of the same Android App and share a single data layer. (Planned) Vue Router will manage navigation between them. Currently, the app is a single screen without a router.
The Vue port of the Viewer is in progress. Sequence Editor and Settings are planned next.

---

## Screen 1 — Viewer

The full-screen PDF reader. Minimal UI, optimized for reading during practice.

### Current state

- **Phase 1 (Vue Port) and Phase 2 (Hamburger/Components) completed.**
- `App.vue` acts as the root layout (`.app-layout`), managing the `TapZones` to allow sharing between future views.
- `PdfViewer.vue` handles the single persistent canvas which is scaled to `devicePixelRatio`. It also handles `EmptyIcon`, and `PageIndicator`. (Note: Originally designed as separate `PortraitView.vue` and `LandscapeView.vue` components, but consolidated for performance).
- Navigation bar: Hamburger menu (`HamburgerButton.vue`), Loop Mode toggle (`LoopModeButton.vue`), dynamic page strip, total page count.
- Hamburger menu handles "Open file" and "Close file" (frees PDF resources properly). "Edit" and "Setting" are placeholders.
- Page strip window calculated dynamically from actual `offsetWidth` of the strip element; `nextTick` awaited before reading `offsetWidth`
- Tap zones and strip visible only after a file is loaded.
- `pointerdown` + `e.preventDefault()` on tap zones and buttons for immediate response (bypassing 300ms touch delay).
- Per-zone debounce cooldown ~400ms (intentional policy for drumming).
- Pending page queuing (rapid taps handled gracefully).
- Empty state shows a placeholder icon that opens the file picker when tapped.
- Currently runs in a local dev server for testing (`npm run dev`).

### Planned additions

- Mode toggle in the navigation bar: Normal mode vs Sequence mode (see Sequences below)
- In Sequence mode the strip shows steps in order as page number labels; active
  step highlighted by position index, not page number value
- External input device support: page turner pedals/remotes pair as Bluetooth
  keyboards and fire standard key events — existing keyboard listener covers this.
  Key binding remapping is a future Settings addition.

### Empty state (no file open)

- View area shows a placeholder icon (`EmptyIcon.vue`)
- Tapping the placeholder icon opens the system file picker directly
- Navigation bar shows the Hamburger menu and loop toggle only; strip and page count are hidden

### Navigation Bar

- **Portrait Mode (Top Bar):** Anchored to the top of the screen (`56px` tall). Contains the Hamburger menu, Loop toggle, Page Strip (horizontal sliding window), and Total Pages indicator.
- **Landscape Mode (Left Side Bar):** Moves to the left edge of the screen (`56px` wide) to maximize vertical space for the PDF canvas. Elements stack vertically. The Page Strip uses a vertical sliding window, and strip buttons become tall rectangles featuring a diagonal line separating the current and next page numbers.

### Hamburger menu

Located at the start of the navigation bar (`HamburgerButton.vue`).

| Item | Enabled when | Behavior |
|---|---|---|
| `Open file` | Always | Opens system file picker |
| `Close file` | File is open | Returns to empty state; frees all PDF resources |
| `Edit` | File is open | (Planned) Navigates to `/editor` for the current file |
| `Setting` | Always | (Planned) Navigates to `/settings` |
| `Close app` | Always | (Capacitor Native Only) Exits the app via `App.exitApp()`. Hidden on web fallback (Phase 10). |

### Page number indicator

A small indicator showing the actual page number of the current page, displayed
as an overlay on the view area. Visible only when a file is open. Always shows
the actual page number regardless of mode or step index.

| Mode | Orientation | Indicators shown |
|---|---|---|
| Normal | Portrait | Right only — shows `currentPage` |
| Sequence | Portrait | Right only — shows actual page number of current step |
| Normal | Landscape | Left — shows `currentPage`; Right — shows `currentPage + 1` |
| Sequence | Landscape | Left — shows actual page number of current step; Right — shows actual page number of next step |

### Tap zones

A small toggle button appears adjacent to the navigation bar (below it in portrait, to its right in landscape), overlaying the top-left
of the view area, only when a file is open. It fits within the `top: 3%` gap
above the prev zone. Tapping it shows/hides the tap zones.

**Left-vertical layout (default):**
- Zone occupies left 40% of screen width, full height of view area
- `tap-prev`: top 39% of zone height, with `top: 3%` gap from navigation bar
- `tap-next`: remaining 45% of zone height, with `3%` gap between prev and next
- Prev zone: green tint `rgba(80, 180, 120, 0.15)`
- Next zone: blue tint `rgba(60, 130, 220, 0.15)`

**Bottom-horizontal layout (optional, configurable in Settings):**
- Zone occupies bottom 20% of screen height, full width of view area
- `tap-next`: left portion — more frequently used, placed on the left for
  thumb convenience
- `tap-prev`: right portion
- Gap between `tap-next` and `tap-prev`: 3% of full screen width
- No top gap (zone is at the bottom edge)
- Zone thickness (20% height) is configured independently from the left-vertical
  zone width (40% width) — they are separate settings, not derived from one source

When toggled off, zones are neither visible nor interactive. Page turning relies
on the strip or external devices only. Toggle state persists in settings.

When zoomed in, zones remain active. Panning may occasionally trigger a zone tap
— this is accepted behavior at this stage.

### Pinch-to-zoom

- Supported via native browser pinch gesture on the view area
- Pinch-to-zoom only — double-tap to zoom not supported (conflicts with cooldown)
- Requires removing `user-scalable=no` from the viewport meta tag, or implementing
  manual pointer-event zoom for finer control
- Zoom applies to the whole canvas as one surface in both portrait and landscape
- Panning while zoomed is standard touch pan behavior

### Landscape mode

Activated automatically when device orientation is landscape. Detected via
`window.matchMedia('(orientation: landscape)')` or the `resize` event.

**Component structure:**
- `PdfViewer.vue` — a single dynamic component that seamlessly handles both Portrait (single page) and Landscape (dual page spread) modes.
- The parent Viewer page passes `isLandscape` down as a prop.
- The single `<canvas>` element inside `PdfViewer.vue` is never unmounted during rotation, ensuring instantaneous, ghost-free transitions.
- Note: `PortraitView.vue` and `LandscapeView.vue` were originally planned and implemented as separate components, but were later deleted from the project tree and consolidated into `PdfViewer.vue` to achieve seamless orientation transitions.

**Landscape rendering:**
- One canvas whose width = left page width + right page width, height = max of
  both page heights
- Page N rendered into the left half; page N+1 rendered into the right half via
  `ctx.translate(leftPageWidth, 0)` before the second render call
- Two page number indicators absolutely positioned over top-left and top-right
  corners of the canvas (see indicator table above).
- If the document only has 1 page, only the left indicator and left half are rendered (centered).
- Pinch-to-zoom and pan apply to the whole spread canvas as one unit.
- The canvas container is strictly bounded via flexbox (`min-height: 0; min-width: 0;`) to prevent height leakage and clipping bugs during orientation changes.

**Page pairing — normal mode:**
- Current page always on the left, `currentPage + 1` on the right
- Advancing moves one step at a time (left page increments by 1)
- Strip labels: `1-2`, `2-3`, `3-4`, `4-5`...

**Page pairing — sequence mode:**
- Pairs are consecutive steps: step N on the left, step N+1 on the right
- For sequence `[1, 2, 3, 4, 1, 2, 4, 5]` (8 steps), strip shows 7 buttons:
  `1-2`, `2-3`, `3-4`, `4-1`, `1-2`, `2-4`, `4-5`
- The last step has no right-side pair and is never the left container — there
  is no state where the right canvas half is empty
- Strip button labels show actual page numbers of the two steps, not step indices
- Tapping a strip button jumps to that step pair; the left number is always the
  left container's page

**Orientation transition:**
- Portrait → landscape: current page becomes the left canvas half; right half
  shows `currentPage + 1` (normal) or next step's page (sequence)
- Landscape → portrait: left canvas half's page becomes the current page;
  right half is discarded
- "Where you are" is always defined by the left half — round-trip orientation
  changes are lossless

---

## Screen 2 — Sequence Editor (/editor)

A dedicated screen for building and managing custom page sequences for a file.
Navigated to via `[Edit]` in the hamburger menu (enabled only when a file is open).

- Shows small page thumbnails rendered via PDF.js at low scale as a source palette
- A reorderable sequence builder below the palette
- Tap a thumbnail to append it to the sequence; drag and drop to reorder
- Create, name, and delete non-default sequences
- The default sequence is displayed read-only and cannot be modified or deleted

---

## Screen 3 — Settings (/settings)

Global configuration screen for visual/layout and behavioral preferences. Not
per-file. Navigated to via the hamburger menu.

Settings stored via `StorageService.js` (Vue Store) and flushed natively to `metadata.json` so they transfer between devices via manual import/export.

**Known candidate settings (not exhaustive):**

| Setting | Type | Default | Notes |
|---|---|---|---|
| Tap zones enabled | Toggle | On | Default state of the in-viewer toggle button |
| Tap zone layout | Option | Left-vertical | Left-vertical or Bottom-horizontal |
| Left zone width | Number input | 40% | Width as % of screen width (left-vertical only) |
| Left zone split | Number input | 39% | Height % of prev zone within left zone |
| Bottom zone height | Number input | 20% | Height as % of screen height (bottom-horizontal only) |
| Tap zone cooldown | Number input | 400ms | Debounce window per zone independently |
| Strip button width | Number input | 56px | Width and height of each page strip button (Portrait only) |
| Prev zone color | Color + opacity | Green 15% | `rgba` of the previous page zone |
| Next zone color | Color + opacity | Blue 15% | `rgba` of the next page zone |

Key binding remapping (for external pedals/remotes) is a planned future addition.

---

## Sequences — Detailed Behavior

### Default sequence

Every file entry is created with a default sequence auto-generated from its total
page count. For a three-page file:

```json
"sequences": [
  { "default": true, "name": "default", "steps": [1, 2, 3] }
]
```

- Created automatically on first open of a file
- Cannot be removed or modified by the user in the Sequence Editor
- Used exclusively for normal mode navigation
- In sequence mode, only non-default sequences are available:
  ```javascript
  const sequenceModeOptions = file.sequences.filter(s => !s.default)
  ```
- If `sequenceModeOptions` is empty, the mode toggle is disabled for that file

### Normal mode

Navigation follows the default sequence (1, 2, 3...). Always the active mode
on first open.

### Sequence mode

Navigation follows a chosen non-default sequence's steps array. Active step
tracked by index internally — not by page number — because the same page can
appear at multiple steps.

### Activating sequence mode

- One non-default sequence → activate immediately
- Multiple non-default sequences → show a picker first
- Resume from the first step whose page number matches the current page
  (first occurrence match).
- If the current page does NOT exist in the selected sequence, the app jumps to Step 0 (the beginning of the sequence).

### Switching back to normal mode

- Take the actual page number of the current step
- Switch to normal mode on that page
- Strip reflects normal linear order around that page

### Direct step navigation

- Tapping a strip button in sequence mode jumps the cursor to that step
- Subsequent next/prev taps continue from that step position

---

## Data Layer

### Persistence strategy

| Layer | Role |
|---|---|
| Vue Store (RAM) | Fast, reactive runtime working layer |
| `metadata.json` (Capacitor Filesystem) | Source of truth — saved natively in the Android app's folder |

- **On app launch:** Capacitor natively reads `metadata.json`, parses it, and populates the Vue Store.
- **On every change:** The Vue Store stringifies its state and Capacitor natively overwrites `metadata.json`.
- All storage logic will be abstracted behind a single `StorageService.js` interface to make adding iOS/Web fallback trivially easy later.

### First launch flow

1. Silently check if the local `metadata.json` exists in the native filesystem.
2. If it does not exist (very first launch), present a welcome screen asking if the user has an existing backup file to import.
3. If they choose **"Skip / New"**: The app silently creates a default `metadata.json` skeleton natively and unlocks immediately.
4. If they choose **"Import"**: The app opens a standard file picker. The user selects their backup JSON file (even if it's named differently, e.g., `metadata(1).json`). The app reads its contents and saves it natively as the permanent `metadata.json`, then unlocks.
5. **Result:** A fully graceful onboarding experience without strict lock-outs.

### First open of a new PDF file

1. Read the last 4KB and compute a compound hash key:
   ```javascript
   const tail = await file.slice(-4096).arrayBuffer()
   const hashBuffer = await crypto.subtle.digest('SHA-256', tail)
   const hashArray = Array.from(new Uint8Array(hashBuffer))
   const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
   const key = `${hashHex}-${file.size}`
   ```
2. Look up the key in the Vue Store's loaded metadata.
3. If found → load existing metadata (sequences, etc.)
4. If not found → create a new entry:
   ```javascript
   {
     key,
     nameHint: file.name,
     sequences: [
       {
         default: true,
         name: 'default',
         steps: Array.from({ length: totalPages }, (_, i) => i + 1)
       }
     ]
   }
   ```
5. Flush to `metadata.json`

### Metadata export/import

`metadata.json` is human-readable and fully portable. 
- **Export:** The Settings screen will provide a manual "Export metadata" button to download a backup.
- **Import:** The Settings screen will provide an "Import / Change metadata" button. Users can explicitly choose to overwrite their current database with a backup file at any time. (Warning: this forcefully replaces their existing data, but gives power users full control over their backups).
- File identity is safely matched by the compound hash key on import.

### Metadata schema

```json
{
  "version": 1,
  "settings": {
    "tapZonesEnabled": true,
    "tapZoneLayout": "left-vertical",
    "leftZoneWidth": 40,
    "leftZoneSplit": 39,
    "bottomZoneHeight": 20,
    "tapZoneCooldown": 400,
    "stripButtonWidth": 56,
    "prevZoneColor": "rgba(80, 180, 120, 0.15)",
    "nextZoneColor": "rgba(60, 130, 220, 0.15)"
  },
  "files": [
    {
      "key": "<sha256-of-last-4kb>-<filesize>",
      "nameHint": "moonlight-sonata.pdf",
      "sequences": [
        { "default": true, "name": "default", "steps": [1, 2, 3, 4, 5] },
        { "name": "with repeats", "steps": [1, 2, 3, 4, 1, 2, 4, 5] }
      ]
    }
  ]
}
```

`nameHint` is not used as a key — stored for human readability and UI display only.

---

## Recommended Implementation Order

Each phase produces something immediately testable natively on Android or via the local dev server.

**Phase 1 — Vue port of prototype** (done)
Behavioral parity with the HTML prototype in Vue 3 + Composition API. Establishes
`usePdfRenderer`, `PageStrip.vue`, `TapZones.vue`, and the initial portrait view structure(`PortraitView.vue`).

**Phase 2 — UI Refinement (Hamburger & Components)** (done)
Replace Open button with hamburger menu (`HamburgerButton.vue`). Implement empty state tap-to-open (`EmptyIcon.vue`). Add `[Close file]` to free resources. Add Loop Mode toggle (`LoopModeButton.vue`). Extracted `TapZones` for future shared usage.

**Phase 3 — Landscape mode (normal mode only)** (done)
Implement dual-page rendering logic using a single `PdfViewer.vue` component with a persistent canvas. Detect orientation
via `matchMedia`. Implement `ctx.translate` two-page rendering. Add page number
indicators. Implement landscape strip with rectangular split buttons and diagonal line separators.
Move navigation bar to the left edge in landscape mode to maximize vertical space.
Implement lossless, instant orientation transition. Sequence mode landscape is deferred to
Phase 6.

**Phase 4 — Routing & Global Store** (planned)
Add Vue Router with `/viewer`, `/editor`, `/settings` routes (must use Hash Routing for Capacitor compatibility). Extract PDF state (`pdfDoc`, `currentPage`, etc.) into a Global Store. This ensures the parsed PDF stays in memory across route changes, enabling the Sequence Editor to reuse the exact same document for thumbnail generation.

**Phase 5 — Data layer (Capacitor Native, Android Only)**
Wrap the Vue app in Ionic Capacitor to generate a native Android `.apk` (using free GitHub Actions cloud builds to avoid local Android Studio overhead). Abstract all storage logic into a single `StorageService.js`. Read/write directly to `metadata.json` using `@capacitor/filesystem` and populate a reactive Vue Store, completely bypassing IndexedDB/Dexie.js. Implement graceful first launch flow (silent creation or manual import). Hash computation on first file open, key lookup, default sequence creation.

**Phase 6 — Sequence mode in Viewer + Landscape**
Add normal/sequence mode toggle to the navigation bar. Wire sequence navigation into strip
and tap zones. Implement picker for multiple sequences. Handle mode switching with
first occurrence match. Complete landscape sequence mode: last-step edge case, step
pair strip labels, left/right indicators for sequence landscape.

**Phase 7 — Sequence Editor**
Implement `/editor` with thumbnail palette and reorderable builder. Create, name,
and delete non-default sequences. Persist via Phase 5 data layer.

**Phase 8 — Settings screen**
Implement `/settings` with known candidate preferences including tap zone layout
option (left-vertical vs bottom-horizontal). Wire all settings into the viewer.
Persist settings via the Data Layer (`StorageService.js`). Add manual "Export metadata" and "Import / Overwrite metadata" buttons for user-controlled backup management.

**Phase 9 — Pinch-to-zoom**
Add pinch-to-zoom to the `PdfViewer.vue` canvas. Decide
between native browser zoom or manual pointer-event implementation. Validate tap
zone usability while zoomed.

**Phase 10 — iOS / Web Fallback Support**
Add IndexedDB support inside `StorageService.js` to enable the app to run as a standard web app in iOS Safari and desktop browsers. Wire up the manual export/import features to support iOS cache eviction mitigation. Reactivate Vite PWA plugin.

---

## Deployment & Platform Notes

- **Primary target:** Android tablet (Native APK via Ionic Capacitor)
- **Secondary target:** iPad (Web fallback, deferred to Phase 10)
- By targeting Android native first via Capacitor, we bypass browser cache eviction and web File System API limitations entirely. Storage is permanent, and native filesystem plugins handle silent metadata saving.
- The `.apk` will be built using a free GitHub Actions pipeline to avoid installing Android Studio locally.
- External page turner devices pair as Bluetooth keyboards — no special API needed

---

## Known Minor Issues (Backlog)

1. **PageStrip responsive to screen resize:** The `PageStrip.vue` calculates how many buttons can fit based on its `offsetWidth`. Currently, this only recalculates on page turn or load. If a user rotates the tablet, the strip layout doesn't automatically adapt to the new screen width until the next page turn. A `ResizeObserver` is needed.
2. **PageStrip window shrinking at document end:** The sliding window logic for the strip calculates `start` first and then `end`. If you are near the last page of the PDF, the window shrinks (e.g., showing only 3 buttons instead of the maximum 5) because the `start` index doesn't shift backward to fill the available space.