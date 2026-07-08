<script setup>
/**
 * LoopModeButton.vue — 루프 모드 토글 버튼 컴포넌트.
 *
 * 파일이 마지막 페이지일 때 다음 페이지로 넘어가면 
 * 첫 페이지로 돌아가게 하는 루프 모드를 켜고 끄는 역할을 한다.
 */
const props = defineProps({
    loopMode: { type: Boolean, required: true }, // 현재 루프 모드 활성화 여부
})

const emit = defineEmits(["toggle-loop-mode"]);
</script>

<template>
    <button :class="`loop-btn${loopMode ? ' loop-btn-on' : ''}`" type="button"
        @pointerdown.stop.prevent="$emit('toggle-loop-mode')">
        <!-- Infinity Loop Icon designed by Gemini (Public Domain) -->
        <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M 7 8 C 3 8 2 10 2 12 C 2 14 3 16 7 16 C 11 16 13 8 17 8 C 21 8 22 10 22 12 C 22 14 21 16 17 16 C 13 16 11 8 7 8 Z"
                stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
    </button>
</template>

<style scoped>
.loop-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 6px;
    background: #333;
    border: 1.5px solid transparent;
    /* active 상태에서 테두리색만 변경하기 위해 투명 테두리 */
    color: #bbb;
    cursor: pointer;
    flex-shrink: 0;
    /* 버튼 크기 고정 — 줄어들지 않음 */
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    /* transition: color 0.2s ease, opacity 0.2s ease; */
}

.loop-btn-on {
    border-color: #2a6fff;
    background: #1a3a6a;
    color: #fff;
}

.loop-btn:active {
    opacity: 0.75;
}
</style>