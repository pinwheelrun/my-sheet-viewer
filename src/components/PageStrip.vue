<script setup>
/**
 * PageStrip — 상단바 컴포넌트.
 *
 * 구성: [햄버거 메뉴] [루프 모드 토글] [◁ 페이지 번호 버튼들 ▷] [총 페이지 수]
 *
 * 【동적 윈도우 계산】
 * 모든 페이지 버튼을 한 번에 표시할 수 없으므로, 현재 페이지를 중심으로
 * 화면에 들어갈 수 있는 만큼만 보여주는 "슬라이딩 윈도우" 방식을 사용한다.
 * 윈도우 크기는 스트립 요소의 실제 픽셀 너비(offsetWidth)에서 계산한다.
 *
 * 【nextTick을 쓰는 이유】
 * currentPage가 바뀌면 Vue가 DOM을 업데이트한 *후에* offsetWidth를 읽어야
 * 정확한 값을 얻을 수 있다. watch + nextTick 조합으로 이를 보장한다.
 *
 * 【컴포넌트 규칙: props down, emits up】
 * - props: currentPage, totalPages, fileLoaded (부모로부터 받는 상태)
 * - emits: open-file, go-to-page (부모에게 동작을 요청)
 * - 이 컴포넌트는 직접 페이지를 바꾸지 않고, 이벤트만 발생시킨다.
 */
import { ref, watch, nextTick, shallowRef } from 'vue'
import HamburgerButton from './atoms/HamburgerButton.vue'
import LoopModeButton from './atoms/LoopModeButton.vue'

const props = defineProps({
  currentPage: { type: Number, required: true },  // 현재 페이지 번호
  totalPages: { type: Number, required: true },   // 총 페이지 수
  fileLoaded: { type: Boolean, required: true },  // PDF 로드 여부
  burgerEaten: { type: Boolean, required: true },
  loopMode: { type: Boolean, required: true },
  isLandscape: { type: Boolean, required: true },
})

const emit = defineEmits(['open-file', "close-file", 'go-to-page', "toggle-hamburger", "toggle-loop-mode"])

/* ── 스트립 윈도우 상태 ── */
const stripRef = shallowRef(null)  // 페이지 버튼들을 감싸는 <div>의 DOM 참조
const windowStart = ref(1)         // 현재 윈도우의 시작 페이지 번호
const windowEnd = ref(1)           // 현재 윈도우의 끝 페이지 번호

const BTN_WIDTH_PORTRAIT = 60;   // 버튼 하나의 차지 너비: 버튼 56px + gap 4px = 60px
const BTN_HEIGHT_LANDSCAPE = 60; // 버튼 하나의 차지 높이: 버튼 54px + gap 6px = 60px

/**
 * 스트립 윈도우를 재계산한다.
 *
 * 1) stripRef의 offsetWidth로 사용 가능한 픽셀 너비를 구한다.
 * 2) BTN_WIDTH로 나눠서 최대 버튼 수(maxBtns)를 계산한다.
 * 3) 현재 페이지를 중심에 놓되, 1 미만 또는 totalPages 초과하지 않도록 클램핑한다.
 */
function recalcWindow() {
  if (!stripRef.value || props.totalPages === 0) return

  const availableSpace = props.isLandscape ? stripRef.value.offsetHeight : stripRef.value.offsetWidth
  const BTN_SIZE = props.isLandscape ? BTN_HEIGHT_LANDSCAPE : BTN_WIDTH_PORTRAIT;
  const maxBtns = Math.max(1, Math.floor(availableSpace / BTN_SIZE))
  const half = Math.floor((maxBtns - 1) / 2)

  let maxPage = props.totalPages
  if (props.isLandscape && maxPage > 1) {
    maxPage = maxPage - 1
  }

  const start = Math.max(1, props.currentPage - half)
  const end = Math.min(maxPage, start + maxBtns - 1)

  windowStart.value = start
  windowEnd.value = end
}

/*
 * currentPage 또는 totalPages가 변경될 때마다 윈도우를 재계산한다.
 * immediate: true → 컴포넌트가 마운트될 때도 즉시 실행.
 * nextTick → DOM 업데이트 후에 offsetWidth를 읽어야 정확한 값을 얻는다.
 */
watch(
  () => [props.currentPage, props.totalPages, props.isLandscape],
  () => {
    nextTick(recalcWindow)
  },
  { immediate: true },
)

/* ── 스트립 내비게이션 헬퍼 ── */

/** 이전 페이지 요청 이벤트 발생 */
function stripPrev() {
  emit('go-to-page', props.currentPage - 1)
}

/** 다음 페이지 요청 이벤트 발생 */
function stripNext() {
  emit('go-to-page', props.currentPage + 1)
}

/** 특정 페이지로 이동 요청 이벤트 발생 */
function goTo(n) {
  if (n === props.currentPage) {
    return;
  }
  emit('go-to-page', n)
}

function openFile() {
  emit('open-file');
  emit("toggle-hamburger");
};

function closeFile() {
  emit("close-file");
  emit("toggle-hamburger");
};
</script>

<template>
  <div class="topbar">
    <!-- 햄버거 버튼 -->
    <HamburgerButton :burger-eaten="burgerEaten" @toggle-hamburger="$emit('toggle-hamburger')" :file-loaded="fileLoaded"
      @open-file="openFile" @close-file="closeFile" />

    <!-- 루프 모드 토글 버튼 -->
    <LoopModeButton :loop-mode="loopMode" @toggle-loop-mode="$emit('toggle-loop-mode')" />

    <!--
      페이지 스트립: PDF 로드 후에만 표시된다.
      구조: [◁ 이전] [페이지 버튼들] [다음 ▷]
    -->
    <div v-if="fileLoaded" class="page-strip-wrap">
      <!-- 이전 페이지 화살표 (첫 페이지에서는 비활성화) -->
      <button class="strip-nav" :disabled="currentPage <= 1" @pointerdown.prevent="stripPrev">
        ‹
      </button>

      <!--
        페이지 번호 버튼 영역.
        ref="stripRef"로 DOM 참조를 저장하여 offsetWidth를 읽는다.
        v-for: windowStart~windowEnd 범위의 버튼만 렌더링 (슬라이딩 윈도우).
        @pointerdown.prevent: 터치 디바이스에서 300ms 지연 없이 즉시 반응 + 기본 동작 방지.
      -->
      <div ref="stripRef" class="page-strip">
        <button v-for="i in windowEnd - windowStart + 1" :key="windowStart + i - 1" class="strip-btn"
          :class="{ active: windowStart + i - 1 === currentPage, 'is-landscape-btn': isLandscape }"
          @pointerdown.prevent="goTo(windowStart + i - 1)">
          <template v-if="isLandscape && (windowStart + i - 1 < totalPages)">
            <span class="left-num">{{ windowStart + i - 1 }}</span>
            <span class="right-num">{{ windowStart + i }}</span>
          </template>
          <template v-else>
            {{ windowStart + i - 1 }}
          </template>
        </button>
      </div>

      <!-- 다음 페이지 화살표 (마지막 페이지에서는 비활성화) -->
      <button class="strip-nav"
        :disabled="isLandscape ? (totalPages > 1 ? currentPage >= totalPages - 1 : currentPage >= totalPages) : currentPage >= totalPages"
        @pointerdown.prevent="stripNext">
        ›
      </button>
    </div>

    <!-- 총 페이지 수 표시 -->
    <div v-if="fileLoaded" class="page-total">
      <span>{{ totalPages }}</span>
    </div>
  </div>
</template>

<style scoped>
/* ── 상단바 ── */
.topbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #111;
  /* 뷰어 배경(#1a1a1a)보다 약간 더 어두운 색 */
  border-bottom: 1px solid #333;
  z-index: 20;
  /* 탭존(z:10)보다 위에 표시 */
  flex-shrink: 0;
  /* 뷰어 영역이 커져도 상단바는 줄어들지 않음 */
  touch-action: none;
  /* 상단바에서 브라우저 기본 터치 동작 방지 */
}

.page-total {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
  background: #333;
  border: 1px solid #3a3a3a;
  color: white;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
  /* 버튼 크기 고정 — 줄어들지 않음 */
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── 페이지 스트립 래퍼 ── */
.page-strip-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
  /* 남은 공간을 모두 차지 → 버튼 수가 이 너비로 결정됨 */
  min-width: 0;
  /* flex 아이템이 내용보다 줄어들 수 있게 허용 */
  overflow: hidden;
  /* 넘치는 버튼은 숨김 */
}

/* 스트립 좌우 화살표 (◁ ▷) */
.strip-nav {
  background: none;
  border: none;
  color: #888;
  font-size: 16px;
  padding: 2px 4px;
  cursor: pointer;
  line-height: 1;
  flex-shrink: 0;
}

.strip-nav:disabled {
  opacity: 0.2;
  /* 비활성화 시 거의 안 보이게 */
  cursor: default;
}

.strip-nav:not(:disabled):active {
  color: #fff;
  /* 터치 피드백 */
}

/* 페이지 버튼들을 감싸는 컨테이너 — offsetWidth를 읽어 윈도우 크기를 결정함 */
.page-strip {
  display: flex;
  gap: 4px;
  align-items: center;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

/* 개별 페이지 번호 버튼 */
.strip-btn {
  width: 56px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  background: #333;
  border: 1.5px solid transparent;
  /* active 상태에서 테두리색만 변경하기 위해 투명 테두리 */
  color: #bbb;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  /* 버튼 크기 고정 — 줄어들지 않음 */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 현재 페이지 버튼 — 파란색 테두리와 어두운 파란 배경으로 강조 */
.strip-btn.active {
  border-color: #2a6fff;
  background: #1a3a6a;
  color: #fff;
}

.strip-btn:active {
  opacity: 0.7;
  /* 터치 피드백 */
}

/* ── 가로 모드 (좌측 사이드바) ── */
@media (orientation: landscape) {
  .topbar {
    flex-direction: column;
    width: 56px;
    height: 100%;
    padding: 12px 0;
    gap: 8px;
  }

  .page-strip-wrap {
    flex-direction: column;
    width: 100%;
    align-items: center;
  }

  .page-strip {
    flex-direction: column;
    width: 100%;
    align-items: center;
    gap: 6px;
  }

  .strip-btn.is-landscape-btn {
    width: 28px;
    /* Slightly narrower to fit padding */
    height: 54px;
    position: relative;
    padding: 6px 4px;
    flex-direction: column;
    justify-content: space-between;
    align-items: stretch;
  }

  .strip-btn .left-num {
    text-align: left;
    font-size: 12px;
    line-height: 1;
  }

  .strip-btn .right-num {
    text-align: right;
    font-size: 12px;
    line-height: 1;
  }

  /* 고정된 각도와 길이의 사선 (CSS 가상 요소 사용) */
  .strip-btn.is-landscape-btn::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 24px;
    /* 사선의 길이 */
    height: 1.5px;
    /* 사선의 두께 */
    background-color: #777;
    /* 선 색상 */
    transform: translate(-50%, -50%) rotate(-65deg);
    /* 정중앙 배치 및 고정 기울기 */
    pointer-events: none;
    border-radius: 1px;
  }

  .strip-nav {
    transform: rotate(90deg);
    /* Rotate arrows to point up/down */
  }
}
</style>
