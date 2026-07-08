<script setup>
/**
 * EmptyIcon.vue — 빈 상태(파일 미로드 시) 뷰어 영역 중앙에 표시되는 아이콘.
 *
 * 파일을 열기 전 화면의 허전함을 채우고,
 * 클릭 시 파일 열기 다이얼로그를 호출할 수 있는 기능을 제공한다.
 */
const emit = defineEmits(["open-file"]);
</script>

<template>
  <div class="empty-state" @click="$emit('open-file')">
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="6" width="36" height="46" rx="3" stroke="currentColor" stroke-width="2.5" />
      <path d="M20 20h24M20 28h24M20 36h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      <circle cx="46" cy="46" r="10" fill="#1a1a1a" stroke="currentColor" stroke-width="2.5" />
      <path d="M43 46h6M46 43v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    </svg>
  </div>
</template>

<style scoped>
/* ── 빈 상태 (파일 미로드 시) ── */
.empty-state {
  position: absolute;
  /* inset: 0; top/right/bottom/left 모두 0 → 컨테이너 전체를 덮음 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
  /* pointer-events: none; 클릭이 뒤의 요소로 통과하도록 */
  padding: 20px;
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
</style>