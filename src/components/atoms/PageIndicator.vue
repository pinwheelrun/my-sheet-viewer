<script setup>
/**
 * PageIndicator.vue — 캔버스 내부 페이지 번호 표시기.
 *
 * 캔버스의 좌측 상단 또는 우측 상단에 현재 표시 중인 페이지 번호를
 * 반투명하게 오버레이하여 보여준다.
 */
import { computed } from 'vue';

const props = defineProps({
    numberToShow: { type: Number, required: true }, // 표시할 페이지 번호
    direction: { type: String, required: false },   // 표시 위치 ('left' 또는 기본값 'right')
});

// 방향에 따른 클래스 이름 계산 (왼쪽 페이지용인지 오른쪽 페이지용인지)
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
    background: #efefef62;
    color: #2a6eff62;
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