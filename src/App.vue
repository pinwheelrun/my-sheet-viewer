<script setup>
/**
 * App.vue — 뷰어 레이아웃 (메인 화면)
 *
 * 이 컴포넌트의 역할:
 * 1. usePdfRenderer 컴포저블을 호출하여 PDF 렌더링 로직을 연결한다.
 * 2. PageStrip(상단바)과 TapZones(탭 존)에 상태와 이벤트를 전달한다.
 * 3. canvas와 뷰어 래퍼를 shallowRef로 관리한다.
 *
 * 【shallowRef를 쓰는 이유】
 * canvas, div 같은 네이티브 DOM 요소는 Vue의 deep reactive proxy로 감싸면
 * 불필요한 오버헤드가 생긴다. shallowRef는 .value 자체의 변경만 추적하므로
 * DOM 요소 참조에 적합하다.
 */
import { shallowRef } from 'vue'
import { usePdfRenderer } from './composables/usePdfRenderer.js'
import PageStrip from './components/PageStrip.vue'
import TapZones from './components/TapZones.vue'

// 템플릿의 ref="canvasRef", ref="viewerWrapRef"와 자동 바인딩된다
const canvasRef = shallowRef(null)     // PDF를 그릴 <canvas> 요소
const viewerWrapRef = shallowRef(null) // canvas를 감싸는 컨테이너 (크기 계산용)

// 컴포저블에서 반응성 상태와 함수들을 가져온다
const {
  currentPage,  // 현재 페이지 번호
  totalPages,   // 총 페이지 수
  fileLoaded,   // PDF 로드 여부 (탭존, 스트립 표시 제어)
  isLoading,    // 로딩 오버레이 표시 여부
  openFile,     // 파일 선택 다이얼로그 열기
  goToPage,     // 특정 페이지로 이동
  prevPage,     // 이전 페이지
  nextPage,     // 다음 페이지
} = usePdfRenderer(canvasRef, viewerWrapRef)
</script>

<template>
  <!--
    상단바: PDF 열기 버튼 + 페이지 스트립.
    Props down, emits up 원칙에 따라 상태는 props로, 동작은 이벤트로 전달.
  -->
  <PageStrip
    :current-page="currentPage"
    :total-pages="totalPages"
    :file-loaded="fileLoaded"
    @open-file="openFile"
    @go-to-page="goToPage"
  />

  <!--
    뷰어 영역: canvas + 빈 상태 + 로딩 오버레이 + 탭 존.
    ref="viewerWrapRef"로 DOM 참조를 컴포저블에 전달한다.
    position: relative로 설정되어 내부의 absolute 요소들(탭존, 로딩 등)의 기준이 된다.
  -->
  <div ref="viewerWrapRef" class="viewer-wrap">

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
      ref="canvasRef"로 DOM 참조를 컴포저블에 전달한다.
    -->
    <canvas ref="canvasRef" class="pdf-canvas"></canvas>

    <!--
      탭 존: 화면 왼쪽에 위치하는 터치 영역 (이전/다음 페이지).
      prev, next 이벤트를 받아 컴포저블의 prevPage, nextPage를 호출한다.
    -->
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
/* ── 뷰어 컨테이너 ── */
.viewer-wrap {
  flex: 1;                 /* 상단바를 제외한 나머지 공간을 모두 차지 */
  position: relative;      /* 내부 absolute 요소(탭존, 로딩 등)의 기준점 */
  overflow: hidden;        /* canvas가 컨테이너를 넘지 않도록 */
  display: flex;
  align-items: center;     /* canvas를 세로 중앙 정렬 */
  justify-content: center; /* canvas를 가로 중앙 정렬 */
  background: #1a1a1a;
}

/* PDF 캔버스 — usePdfRenderer가 width/height를 동적으로 설정한다 */
.pdf-canvas {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;     /* 비율을 유지하면서 컨테이너에 맞춤 */
  touch-action: none;      /* 브라우저 기본 터치 동작(스크롤, 핀치줌) 비활성화 */
}

/* ── 빈 상태 (파일 미로드 시) ── */
.empty-state {
  position: absolute;
  inset: 0;                /* top/right/bottom/left 모두 0 → 컨테이너 전체를 덮음 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #666;
  pointer-events: none;    /* 클릭이 뒤의 요소로 통과하도록 */
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
  background: rgba(26, 26, 26, 0.85); /* 반투명 어두운 배경 */
  z-index: 30;             /* 탭존(z:10), 화살표 힌트(z:12)보다 위에 표시 */
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
