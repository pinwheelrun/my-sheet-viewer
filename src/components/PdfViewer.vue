<script setup>
/**
 * PdfViewer.vue — PDF 뷰어 영역 (세로 단일 보기 / 가로 두 장 보기 동적 컴포넌트)
 *
 * canvas, 빈 상태 안내 아이콘, 로딩 오버레이, 페이지 번호 표시기를 포함한다.
 * 화면 방향(isLandscape)에 따라 페이지와 페이지 번호 표시기를 1개 또는 2개 보여준다.
 *
 * 【ref 전달 패턴: setter 함수】
 * canvas와 viewerWrap의 DOM 요소는 부모(App.vue)가 소유하는 shallowRef에 저장되어야 한다.
 * Vue의 <script setup>에서 선언한 ref는 템플릿에서 auto-unwrap되므로,
 * shallowRef 객체를 직접 prop으로 전달할 수 없다 (null이 전달됨).
 * 대신 부모가 setter 함수를 만들어 전달하고, 이 컴포넌트는 :ref 바인딩으로
 * 해당 setter를 호출하여 DOM 요소를 부모의 shallowRef에 설정한다.
 *
 * 【컴포넌트 규칙: props down, emits up】
 * - 뷰어 상태(fileLoaded, isLoading, currentPage, totalPages, isLandscape)를 props로 받는다.
 * - 빈 상태 화면에서 파일을 여는 open-file 이벤트를 부모에게 전달한다.
 */
import EmptyIcon from './atoms/EmptyIcon.vue';
import PageIndicator from './atoms/PageIndicator.vue';

defineProps({
  setCanvasEl: { type: Function, required: true },      // (el: HTMLCanvasElement|null) => void
  setViewerWrapEl: { type: Function, required: true },  // (el: HTMLElement|null) => void
  fileLoaded: { type: Boolean, required: true },        // PDF 로드 여부
  isLoading: { type: Boolean, required: true },         // 로딩 오버레이 표시 여부
  currentPage: { type: Number, required: true },        // 현재 페이지 번호 (가로 모드인 경우 항상 왼쪽 페이지)
  totalPages: { type: Number, required: true },         // 총 페이지 수 (가로 모드인 경우에 우측 표시기 조건 제어)
  isLandscape: { type: Boolean, required: true },       // 가로 모드 여부
})

defineEmits(["open-file"])
</script>

<template>
  <!--
    뷰어 영역: canvas + 빈 상태 + 로딩 오버레이
    :ref="setViewerWrapEl"로 부모의 setter를 호출하여 DOM 요소를 shallowRef에 설정한다.
    position: relative로 설정되어 내부의 absolute 요소들(로딩 등)의 기준이 된다.
  -->
  <div :ref="setViewerWrapEl" class="viewer-wrap">

    <!-- 빈 상태: PDF가 아직 로드되지 않았을 때 표시하는 안내 아이콘 -->
    <EmptyIcon v-if="!fileLoaded" @open-file="$emit('open-file')" />

    <!-- 로딩 오버레이: PDF 파싱 중 반투명 배경 위에 스피너 표시 -->
    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <span>Loading…</span>
    </div>

    <div class="canvas-container" v-show="fileLoaded">
      <!--
        PDF 캔버스: usePdfRenderer가 이 canvas에 PDF 페이지를 렌더링한다.
        :ref="setCanvasEl"로 부모의 setter를 호출하여 DOM 요소를 shallowRef에 설정한다.
      -->
      <canvas :ref="setCanvasEl" class="pdf-canvas"></canvas>

      <!-- 현재 페이지 번호 표시기 - 세로 모드일 때는 단일 페이지의 우측상단에, 가로 모드일 때는 좌측 페이지의 좌측상단에 위치 -->
      <PageIndicator :number-to-show="currentPage" :direction="isLandscape ? 'left' : 'right'" />
      <!-- 다음 페이지 번호 표시기 - 가로 모드일 때만 존재하며 우측 페이지의 우측상단에 위치 -->
      <PageIndicator v-if="isLandscape && currentPage < totalPages" :number-to-show="currentPage + 1" direction="right" />
    </div>
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
  min-height: 0;
  min-width: 0;
}

.canvas-container {
  position: relative;
  display: flex;
  max-width: 100%;
  max-height: 100%;
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
