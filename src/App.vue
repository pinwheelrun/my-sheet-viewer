<script setup>
/**
 * App.vue — 뷰어 레이아웃 (메인 화면)
 *
 * 이 컴포넌트의 역할:
 * 1. usePdfRenderer 컴포저블을 호출하여 PDF 렌더링 로직을 연결한다.
 * 2. PageStrip(상단바)과 뷰어 스크린 영역(.viewer-screen)을 조합하여 화면을 구성한다.
 * 3. canvas와 뷰어 래퍼의 shallowRef를 소유하고, setter 함수를 하위 뷰어 컴포넌트에 전달한다.
 *
 * 【shallowRef를 쓰는 이유】
 * canvas, div 같은 네이티브 DOM 요소는 Vue의 deep reactive proxy로 감싸면
 * 불필요한 오버헤드가 생긴다. shallowRef는 .value 자체의 변경만 추적하므로
 * DOM 요소 참조에 적합하다.
 *
 * 【setter 함수를 쓰는 이유】
 * Vue의 <script setup>에서 선언한 ref는 템플릿에서 자동으로 .value가 풀린다(auto-unwrap).
 * 따라서 :canvas-ref="canvasRef"로 전달하면 shallowRef 객체가 아닌 null이 전달된다.
 * 이를 우회하기 위해 setter 함수를 만들어 전달하면, 함수는 auto-unwrap되지 않으므로
 * 하위 컴포넌트에서 :ref="setCanvasEl"로 사용하면 DOM 요소가 정상적으로 설정된다.
 *
 * 【TapZones 분리 이유】
 * Phase 3에서 LandscapeView가 추가되고 화면 방향에 따라
 * PortraitView 또는 LandscapeView를 조건부 렌더링할 때,
 * 터치 영역(TapZones)은 두 뷰에서 공통으로 사용되므로 상위 컨테이너(.viewer-screen)로 분리하였다.
 * 현재는 PortraitView만 사용한다.
 *
 * 【향후 변경 예정】
 * Phase 2에서 Vue Router가 추가되면 이 파일은 ViewerPage.vue로 이동하고,
 * App.vue는 <RouterView>만 렌더링하는 셸이 된다.
 */
import { shallowRef } from 'vue'

import { usePdfRenderer } from './composables/usePdfRenderer.js'
import { useHamburger } from './composables/useHamburger.js'

import PageStrip from './components/PageStrip.vue'
import PortraitView from './components/PortraitView.vue'
import TapZones from './components/TapZones.vue'

// shallowRef 소유 — usePdfRenderer가 이 ref들의 .value를 읽어 렌더링한다
const canvasRef = shallowRef(null)     // PDF를 그릴 <canvas> 요소
const viewerWrapRef = shallowRef(null) // canvas를 감싸는 컨테이너 (크기 계산용)

// setter 함수 — PortraitView가 :ref 바인딩으로 호출하여 DOM 요소를 설정한다
// (함수는 Vue 템플릿에서 auto-unwrap되지 않으므로 shallowRef가 정상 작동한다)
function setCanvasEl(el) { canvasRef.value = el }
function setViewerWrapEl(el) { viewerWrapRef.value = el }

// 컴포저블에서 반응성 상태와 함수들을 가져온다
const {
  currentPage,    // 현재 페이지 번호
  totalPages,     // 총 페이지 수
  loopMode,       // 루프 모드 여부
  fileLoaded,     // PDF 로드 여부 (탭존, 스트립 표시 제어)
  isLoading,      // 로딩 오버레이 표시 여부
  openFile,       // 파일 선택 다이얼로그 열기
  closeFile,      // 현재 열려있는 파일 닫기
  toggleLoopMode, // 루프 모드 토글
  goToPage,       // 특정 페이지로 이동
  prevPage,       // 이전 페이지
  nextPage,       // 다음 페이지
} = usePdfRenderer(canvasRef, viewerWrapRef)

const {
  burgerEaten,
  toggleHamburger,
} = useHamburger();
</script>

<template>
  <!--
    상단바: PDF 열기 버튼 + 페이지 스트립.
    Props down, emits up 원칙에 따라 상태는 props로, 동작은 이벤트로 전달.
  -->
  <PageStrip :current-page="currentPage" :total-pages="totalPages" :file-loaded="fileLoaded" @open-file="openFile"
    @close-file="closeFile" @go-to-page="goToPage" :burger-eaten="burgerEaten" @toggle-hamburger="toggleHamburger"
    :loop-mode="loopMode" @toggle-loop-mode="toggleLoopMode" />

  <!--
    뷰어 영역: setter 함수를 통해 DOM 요소를 shallowRef에 연결한다.
    PortraitView가 마운트되면 :ref 바인딩이 setter를 호출하고,
    usePdfRenderer가 해당 ref들의 .value를 읽어 렌더링한다.
  -->
  <div class="viewer-screen">
    <PortraitView :set-canvas-el="setCanvasEl" :set-viewer-wrap-el="setViewerWrapEl" :file-loaded="fileLoaded"
      :is-loading="isLoading" :current-page="currentPage" @open-file="openFile" />

    <!--
      탭 존: 화면 왼쪽에 위치하는 터치 영역 (이전/다음 페이지).
      prev, next 이벤트를 받아 부모에게 그대로 전달한다.
    -->
    <TapZones :file-loaded="fileLoaded" :current-page="currentPage" :total-pages="totalPages" @prev="prevPage"
      @next="nextPage" />
  </div>

</template>

<style scoped>
.viewer-screen {
  position: relative;
  flex: 1;
  display: flex;
}
</style>
