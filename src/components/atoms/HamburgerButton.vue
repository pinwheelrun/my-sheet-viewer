<script setup>
const props = defineProps({
    fileLoaded: { type: Boolean, required: true },  // PDF 로드 여부
    burgerEaten: { type: Boolean, required: true },
})

const emit = defineEmits(['open-file', "close-file", "toggle-hamburger"])

function alertInConstruction() {
    emit("toggle-hamburger");
    alert("TODO");
};
</script>

<template>
    <div class="hamburger-menu">
        <button class="hamburger-btn" type="button" aria-label="Open menu" :aria-expanded="burgerEaten"
            @pointerdown.stop.prevent="$emit('toggle-hamburger')">
            <!-- License: MIT. Made by Will Kelly: https://www.will-kelly.co.uk/ -->
            <svg width="100%" height="100%" viewBox="0 0 24.96 24.96" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.2 7.28h14.56 M5.2 12.48h14.56 M5.2 17.68h14.56" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round" />
            </svg>

        </button>

        <div v-if="burgerEaten" class="menu-panel">
            <button type="button" class="menu-item" @click="$emit('open-file')">Open file</button>
            <button type="button" class="menu-item" @click="$emit('close-file')" :disabled="!fileLoaded">Close
                file</button>
            <button type="button" class="menu-item" :disabled="!fileLoaded" @click="alertInConstruction">Edit</button>
            <button type="button" class="menu-item" @click="alertInConstruction">Setting</button>
        </div>
    </div>
</template>

<style scoped>
.hamburger-menu {
    position: relative;
    flex-shrink: 0;
}

.hamburger-btn {
    width: 32px;
    height: 32px;
    border: 1px solid #3a3a3a;
    border-radius: 6px;
    background: #2a6fff;
    color: #ddd;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 0;
}

.hamburger-btn:active {
    opacity: 0.75;
}

.menu-panel {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    min-width: 132px;
    padding: 6px;
    border: 1px solid #333;
    border-radius: 6px;
    background: #181818;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
    z-index: 50;
}

.menu-item {
    width: 100%;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #e0e0e0;
    cursor: pointer;
    display: block;
    font-size: 13px;
    padding: 8px 10px;
    text-align: left;
    white-space: nowrap;
}

.menu-item:not(:disabled):active {
    background: #2a2a2a;
}

.menu-item:disabled {
    color: #666;
    cursor: default;
}
</style>