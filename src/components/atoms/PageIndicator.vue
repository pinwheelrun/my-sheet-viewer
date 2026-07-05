<script setup>
import { computed } from 'vue';

const props = defineProps({
    numberToShow: { type: Number, required: true },
    direction: { type: String, required: false },
});

const direction = computed(() => props.direction !== "left" ? " right-page" : " left-page");
</script>

<template>
    <div :class="`page-indicator${direction}`">
        <span>{{ numberToShow }}</span>
    </div>
</template>

<style scoped>
.page-indicator {
    z-index: 10;
    position: absolute;
    top: 0;
    width: 50px;
    height: 50px;
    padding: 0;
    background: #efefefaa;
    color: #2a6fff;
    font-size: 30px;
    font-weight: 800;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
}

.right-page {
    right: 0;
}

.left-page {
    left: 0;
}
</style>