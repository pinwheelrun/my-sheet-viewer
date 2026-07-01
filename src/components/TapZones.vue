<script setup>
/**
 * TapZones — left-side tap zones for prev/next navigation.
 * Only visible when a file is loaded.
 * Emits `prev` and `next` events; parent wires them to composable.
 */
defineProps({
  fileLoaded: { type: Boolean, required: true },
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

defineEmits(['prev', 'next'])
</script>

<template>
  <template v-if="fileLoaded">
    <!-- Tap zones -->
    <div class="tap-zone tap-prev" @click="$emit('prev')"></div>
    <div class="tap-zone tap-next" @click="$emit('next')"></div>

    <!-- Arrow hints -->
    <div
      class="arrow-hint arrow-hint-prev"
      :style="{ opacity: currentPage > 1 ? 1 : 0 }"
    >
      ‹
    </div>
    <div
      class="arrow-hint arrow-hint-next"
      :style="{ opacity: currentPage < totalPages ? 1 : 0 }"
    >
      ›
    </div>
  </template>
</template>

<style scoped>
/* Tap zones — left 15% only, split vertically */
.tap-zone {
  position: absolute;
  left: 0;
  width: 15%;
  z-index: 10;
  cursor: pointer;
}

.tap-prev {
  top: 0;
  height: 30%;
  background: rgba(80, 180, 120, 0.15);
}

.tap-next {
  top: 30%;
  bottom: 0;
  background: rgba(60, 130, 220, 0.15);
}

/* Arrow hints — left side only */
.arrow-hint {
  position: absolute;
  left: 14px;
  width: 15%;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.2);
  pointer-events: none;
  z-index: 12;
  user-select: none;
  text-align: left;
}

.arrow-hint-prev {
  top: 10%;
}

.arrow-hint-next {
  top: 60%;
}
</style>
