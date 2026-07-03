<script setup>
/**
 * TapZones — 화면 왼쪽의 터치 영역 (이전/다음 페이지 이동).
 *
 * 【배치】
 * 뷰어 왼쪽 30% 영역을 상하로 분할:
 * - 상단 35%: 이전 페이지 (초록 틴트)
 * - 하단 65%: 다음 페이지 (파란 틴트)
 *
 * 【화살표 힌트】
 * 각 탭존 안에 ‹ / › 기호를 표시하여 터치 영역임을 시각적으로 안내한다.
 * 첫 페이지에서는 ‹ 힌트의 opacity가 0, 마지막 페이지에서는 › 힌트의 opacity가 0.
 *
 * 【컴포넌트 규칙: props down, emits up】
 * - 이 컴포넌트는 자체적으로 페이지를 변경하지 않는다.
 * - prev / next 이벤트를 emit하고, 부모(App.vue)가 컴포저블의 함수를 호출한다.
 *
 * 【@pointerdown.prevent를 쓰는 이유】
 * click 대신 pointerdown을 사용하면 터치 디바이스에서 ~300ms 지연 없이 즉시 반응한다.
 * .prevent로 기본 동작(텍스트 선택, 컨텍스트 메뉴 등)을 방지한다.
 */
defineProps({
  fileLoaded: { type: Boolean, required: true },  // PDF 로드 여부 — false이면 탭존 숨김
  currentPage: { type: Number, required: true },  // 현재 페이지 — 화살표 힌트 opacity 제어
  totalPages: { type: Number, required: true },   // 총 페이지 수 — 화살표 힌트 opacity 제어
})

defineEmits(['prev', 'next'])
</script>

<template>
  <!-- fileLoaded가 true일 때만 탭존과 화살표 힌트를 렌더링 -->
  <template v-if="fileLoaded">
    <!-- 탭존: 각각 클릭/터치 시 이벤트를 emit -->
    <div class="tap-zone tap-prev" @pointerdown.prevent="$emit('prev')"></div>
    <div class="tap-zone tap-next" @pointerdown.prevent="$emit('next')"></div>

    <!--
      화살표 힌트: pointer-events: none이므로 터치를 가로채지 않는다.
      이전/다음 페이지가 존재할 때만 보이도록 opacity를 동적으로 설정한다.
    -->
    <div class="arrow-hint arrow-hint-prev" :style="{ opacity: currentPage > 1 ? 1 : 0 }">
      ‹
    </div>
    <div class="arrow-hint arrow-hint-next" :style="{ opacity: currentPage < totalPages ? 1 : 0 }">
      ›
    </div>
  </template>
</template>

<style scoped>
/*
 * 탭존 공통 스타일.
 * position: absolute → 부모(.viewer-wrap)를 기준으로 배치.
 * touch-action: none → 브라우저의 기본 터치 동작(스크롤, 줌 등) 완전 비활성화.
 */
.tap-zone {
  position: absolute;
  left: 0;
  width: 30%;
  /* 화면 왼쪽 30% 영역 */
  z-index: 10;
  cursor: pointer;
  touch-action: none;
}

/* 이전 페이지 탭존 — 상단 35% (초록 틴트) */
.tap-prev {
  top: 0;
  height: 35%;
  background: rgba(80, 180, 120, 0.15);
  /* 반투명 초록 — 영역 시각화용 */
}

/* 다음 페이지 탭존 — 나머지 하단 65% (파란 틴트) */
.tap-next {
  top: 35%;
  bottom: 0;
  background: rgba(60, 130, 220, 0.15);
  /* 반투명 파랑 — 영역 시각화용 */
}

/* 화살표 힌트 공통 스타일 */
.arrow-hint {
  position: absolute;
  left: 14px;
  width: 15%;
  font-size: 22px;
  color: rgba(255, 255, 255, 0.2);
  /* 매우 연한 흰색 — 눈에 거슬리지 않게 */
  pointer-events: none;
  /* 터치/클릭을 통과시켜 뒤의 탭존이 받도록 */
  z-index: 12;
  /* 탭존(z:10)보다 위에 표시 */
  user-select: none;
  /* 텍스트 선택 방지 */
  text-align: left;
}

/* ‹ 이전 힌트 — 탭존 상단 영역의 중간쯤 */
.arrow-hint-prev {
  top: 10%;
}

/* › 다음 힌트 — 탭존 하단 영역의 중간쯤 */
.arrow-hint-next {
  top: 60%;
}
</style>
