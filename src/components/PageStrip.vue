<script setup>
/**
 * PageStrip — top bar with Open button, page strip, and total pages.
 *
 * The dynamic strip window is calculated from the actual pixel width
 * of the strip element using offsetWidth, recalculated after nextTick
 * whenever currentPage changes.
 */
import { ref, watch, nextTick, shallowRef } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  fileLoaded: { type: Boolean, required: true },
})

const emit = defineEmits(['open-file', 'go-to-page'])

/* ── Strip window state ── */
const stripRef = shallowRef(null)
const windowStart = ref(1)
const windowEnd = ref(1)

const BTN_WIDTH = 60 // 56px button + 4px gap

function recalcWindow() {
  if (!stripRef.value || props.totalPages === 0) return

  const stripWidth = stripRef.value.offsetWidth
  const maxBtns = Math.max(1, Math.floor(stripWidth / BTN_WIDTH))
  const half = Math.floor((maxBtns - 1) / 2)
  const start = Math.max(1, props.currentPage - half)
  const end = Math.min(props.totalPages, start + maxBtns - 1)

  windowStart.value = start
  windowEnd.value = end
}

/* Recalc after DOM updates whenever page or total changes */
watch(
  () => [props.currentPage, props.totalPages],
  () => {
    nextTick(recalcWindow)
  },
  { immediate: true },
)

/* ── Strip nav helpers ── */
function stripPrev() {
  emit('go-to-page', props.currentPage - 1)
}

function stripNext() {
  emit('go-to-page', props.currentPage + 1)
}

function goTo(n) {
  emit('go-to-page', n)
}
</script>

<template>
  <div class="topbar">
    <button class="open-btn" @click="$emit('open-file')">Open PDF</button>

    <div v-if="fileLoaded" class="page-strip-wrap">
      <button class="strip-nav" :disabled="currentPage <= 1" @pointerdown.prevent="stripPrev">
        ‹
      </button>

      <div ref="stripRef" class="page-strip">
        <button v-for="i in windowEnd - windowStart + 1" :key="windowStart + i - 1" class="strip-btn"
          :class="{ active: windowStart + i - 1 === currentPage }" @pointerdown.prevent="goTo(windowStart + i - 1)">
          {{ windowStart + i - 1 }}
        </button>
      </div>

      <button class="strip-nav" :disabled="currentPage >= totalPages" @pointerdown.prevent="stripNext">
        ›
      </button>
    </div>

    <span v-if="fileLoaded" class="page-total">{{ totalPages }}</span>
  </div>
</template>

<style scoped>
/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #111;
  border-bottom: 1px solid #333;
  z-index: 20;
  flex-shrink: 0;
  touch-action: none;
}

.open-btn {
  background: #2a6fff;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.open-btn:active {
  opacity: 0.8;
}

.page-total {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Page strip in top bar ── */
.page-strip-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  touch-action: none;
}

.strip-nav {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  padding: 2px 4px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
  touch-action: none;
}

.strip-nav:disabled {
  opacity: 0.2;
  cursor: default;
}

.strip-nav:not(:disabled):active {
  color: #fff;
}

.page-strip {
  display: flex;
  gap: 4px;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  touch-action: none;
}

.strip-btn {
  width: 56px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  background: #333;
  border: 1.5px solid transparent;
  color: #bbb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.strip-btn.active {
  border-color: #2a6fff;
  background: #1a3a6a;
  color: #fff;
}

.strip-btn:active {
  opacity: 0.7;
}
</style>
