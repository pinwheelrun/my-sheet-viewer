<script setup>
/**
 * PortraitView.vue — 세로 모드 뷰어 영역.
 *
 * App.vue에서 추출한 뷰어 영역 컴포넌트.
 * canvas, 빈 상태, 로딩 오버레이, 탭 존을 포함한다.
 *
 * 【추출 목적】
 * Phase 3에서 LandscapeView.vue가 추가되면, 부모(Viewer 페이지)가
 * 화면 방향에 따라 PortraitView 또는 LandscapeView를 조건부 렌더링한다.
 * App.vue에 직접 뷰어 영역을 두면 이 전환이 불가능하므로 분리한다.
 *
 * 【ref 전달 패턴: setter 함수】
 * canvas와 viewerWrap의 DOM 요소는 부모(App.vue)가 소유하는 shallowRef에 저장되어야 한다.
 * Vue의 <script setup>에서 선언한 ref는 템플릿에서 auto-unwrap되므로,
 * shallowRef 객체를 직접 prop으로 전달할 수 없다 (null이 전달됨).
 * 대신 부모가 setter 함수를 만들어 전달하고, 이 컴포넌트는 :ref 바인딩으로
 * 해당 setter를 호출하여 DOM 요소를 부모의 shallowRef에 설정한다.
 *
 * 【컴포넌트 규칙: props down, emits up】
 * - 뷰어 상태(fileLoaded, isLoading, currentPage, totalPages)를 props로 받는다
 * - 탭 존에서 올라온 prev/next 이벤트를 그대로 부모에게 전달한다
 */
import TapZones from './TapZones.vue'

defineProps({
  setCanvasEl: { type: Function, required: true },      // (el: HTMLCanvasElement|null) => void
  setViewerWrapEl: { type: Function, required: true },  // (el: HTMLElement|null) => void
  fileLoaded: { type: Boolean, required: true },        // PDF 로드 여부
  isLoading: { type: Boolean, required: true },         // 로딩 오버레이 표시 여부
  currentPage: { type: Number, required: true },        // 현재 페이지 번호
  totalPages: { type: Number, required: true },         // 총 페이지 수
})

defineEmits(['prev', 'next'])
</script>

<template>
  <!--
    뷰어 영역: canvas + 빈 상태 + 로딩 오버레이 + 탭 존.
    :ref="setViewerWrapEl"로 부모의 setter를 호출하여 DOM 요소를 shallowRef에 설정한다.
    position: relative로 설정되어 내부의 absolute 요소들(탭존, 로딩 등)의 기준이 된다.
  -->
  <div :ref="setViewerWrapEl" class="viewer-wrap">

    <!-- 빈 상태: PDF가 아직 로드되지 않았을 때 표시하는 안내 아이콘 -->
    <div v-if="!fileLoaded" class="empty-state">
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="12" y="6" width="36" height="46" rx="3" stroke="currentColor" stroke-width="2.5" />
        <path d="M20 20h24M20 28h24M20 36h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        <circle cx="46" cy="46" r="10" fill="#1a1a1a" stroke="currentColor" stroke-width="2.5" />
        <path d="M43 46h6M46 43v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
      </svg>
    </div>

    <!-- 로딩 오버레이: PDF 파싱 중 반투명 배경 위에 스피너 표시 -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <span>Loading…</span>
    </div>

    <!--
      PDF 캔버스: usePdfRenderer가 이 canvas에 PDF 페이지를 렌더링한다.
      :ref="setCanvasEl"로 부모의 setter를 호출하여 DOM 요소를 shallowRef에 설정한다.
    -->
    <canvas :ref="setCanvasEl" class="pdf-canvas"></canvas>

    <!--
      탭 존: 화면 왼쪽에 위치하는 터치 영역 (이전/다음 페이지).
      prev, next 이벤트를 받아 부모에게 그대로 전달한다.
    -->
    <TapZones
      :file-loaded="fileLoaded"
      :current-page="currentPage"
      :total-pages="totalPages"
      @prev="$emit('prev')"
      @next="$emit('next')"
    />
  </div>
</template>

<style scoped>
/* ── 뷰어 컨테이너 ── */
.viewer-wrap {
  flex: 1;
  /* 상단바를 제외한 나머지 공간을 모두 차지 */
  position: relative;
  /* 내부 absolute 요소(탭존, 로딩 등)의 기준점 */
  overflow: hidden;
  /* canvas가 컨테이너를 넘지 않도록 */
  display: flex;
  align-items: center;
  /* canvas를 세로 중앙 정렬 */
  justify-content: center;
  /* canvas를 가로 중앙 정렬 */
  background: #1a1a1a;
}

/* PDF 캔버스 — usePdfRenderer가 width/height를 동적으로 설정한다 */
.pdf-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  /* 비율을 유지하면서 컨테이너에 맞춤 */
  touch-action: none;
  /* 브라우저 기본 터치 동작(스크롤, 핀치줌) 비활성화 */
}

/* ── 빈 상태 (파일 미로드 시) ── */
.empty-state {
  position: absolute;
  inset: 0;
  /* top/right/bottom/left 모두 0 → 컨테이너 전체를 덮음 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
  pointer-events: none;
  /* 클릭이 뒤의 요소로 통과하도록 */
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

/* ── 로딩 오버레이 ── */
.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(26, 26, 26, 0.85);
  /* 반투명 어두운 배경 */
  z-index: 30;
  /* 탭존(z:10), 화살표 힌트(z:12)보다 위에 표시 */
  flex-direction: column;
  gap: 12px;
  font-size: 14px;
  color: #aaa;
}

/* CSS-only 스피너: border-top만 색을 다르게 하여 회전 애니메이션 */
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
