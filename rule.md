# rule.md

## Stack
Vue 3, Composition API, Vite, Dexie.js for IndexedDB

## Reactivity Rules
- Native browser objects → shallowRef or plain let
- Only UI-driving state → ref/reactive
- pdfDoc, file handles, canvas elements never go inside reactivity

## Composables
- usePdfRenderer — all PDF.js logic
- useMetadata — IndexedDB + JSON file sync
- useSequence — sequence mode state and navigation

## Component Structure
- ViewerPage.vue — canvas, tap zones, top bar
- LibraryPage.vue — file browser, tags, collections
- SequenceEditorPage.vue — sequence builder
- PageStrip.vue — reusable across viewer and editor
- TapZones.vue — emits prev/next only

## Conventions
- Components only handle UI and emit events
- Business logic lives in composables
- Props down, emits up strictly