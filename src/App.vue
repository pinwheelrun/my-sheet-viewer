<script setup>
/**
 * App.vue — Viewer layout.
 * Wires the usePdfRenderer composable to PageStrip and TapZones.
 * Canvas and viewer wrapper are shallowRefs (native DOM elements).
 */
import { shallowRef } from 'vue'
import { usePdfRenderer } from './composables/usePdfRenderer.js'
import PageStrip from './components/PageStrip.vue'
import TapZones from './components/TapZones.vue'

const canvasRef = shallowRef(null)
const viewerWrapRef = shallowRef(null)

const {
  currentPage,
  totalPages,
  fileLoaded,
  isLoading,
  openFile,
  goToPage,
  prevPage,
  nextPage,
} = usePdfRenderer(canvasRef, viewerWrapRef)
</script>

<template>
  <PageStrip
    :current-page="currentPage"
    :total-pages="totalPages"
    :file-loaded="fileLoaded"
    @open-file="openFile"
    @go-to-page="goToPage"
  />

  <div ref="viewerWrapRef" class="viewer-wrap">
    <!-- Empty state -->
    <div v-if="!fileLoaded" class="empty-state">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="6" width="36" height="46" rx="3" stroke="currentColor" stroke-width="2.5" />
        <path d="M20 20h24M20 28h24M20 36h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="46" cy="46" r="10" fill="#1a1a1a" stroke="currentColor" stroke-width="2.5" />
        <path d="M43 46h6M46 43v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </div>

    <!-- Loading overlay -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <span>Loading…</span>
    </div>

    <!-- PDF canvas -->
    <canvas ref="canvasRef" class="pdf-canvas"></canvas>

    <!-- Tap zones -->
    <TapZones
      :file-loaded="fileLoaded"
      :current-page="currentPage"
      :total-pages="totalPages"
      @prev="prevPage"
      @next="nextPage"
    />
  </div>
</template>

<style scoped>
/* ── Viewer ── */
.viewer-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a1a;
}

.pdf-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  touch-action: none;
}

/* ── Empty state ── */
.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
  pointer-events: none;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  opacity: 0.4;
}

.empty-state p {
  font-size: 15px;
  text-align: center;
  line-height: 1.5;
}

.empty-state strong {
  color: #aaa;
}

/* ── Loading ── */
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 26, 0.85);
  z-index: 30;
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: #aaa;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #444;
  border-top-color: #2a6fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
