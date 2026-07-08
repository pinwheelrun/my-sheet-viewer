/**
 * usePdfRenderer — PDF.js 렌더링 로직을 캡슐화하는 컴포저블.
 *
 * 【반응성 규칙】
 * PDF.js 객체(pdfDoc 등)는 Vue의 reactive/ref로 감싸면 Proxy가 내부 구조를 망가뜨린다.
 * 따라서 pdfDoc, rendering, pendingPage 등은 일반 let 변수로 선언한다.
 * UI에 직접 바인딩되는 값(currentPage, totalPages, fileLoaded, isLoading)만 ref()로 관리한다.
 *
 * 【사용법】
 * 호출하는 쪽(App.vue)에서 canvas와 뷰어 래퍼의 shallowRef를 전달한다:
 *   const canvasRef = shallowRef(null)
 *   const viewerWrapRef = shallowRef(null)
 *   const { currentPage, ... } = usePdfRenderer(canvasRef, viewerWrapRef)
 *
 * @param {import('vue').ShallowRef<HTMLCanvasElement|null>} canvasRef  - PDF를 그릴 canvas 요소
 * @param {import('vue').ShallowRef<HTMLElement|null>} viewerWrapRef    - canvas를 감싸는 컨테이너 (크기 계산용)
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'

/*
 * PDF.js 워커 설정
 * ?url 접미사: Vite가 워커 파일을 별도 에셋으로 빌드하고, 그 URL 문자열을 반환한다.
 * 이렇게 하면 CDN 없이 로컬 빌드된 워커를 사용할 수 있다.
 */
import PDFWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'
GlobalWorkerOptions.workerSrc = PDFWorker

export function usePdfRenderer(canvasRef, viewerWrapRef) {

  /* ── 일반 변수 (Vue 반응성 밖) ── */
  let pdfDoc = null       // PDF.js 문서 객체 — 절대 ref()로 감싸지 않는다
  let loadingTask = null  // PDF.js 로딩 태스크 — 문서 destroy()는 이 객체가 소유한다
  let renderTask = null   // 현재 PDF.js 렌더 태스크 — 파일 교체 전 취소한다
  let canvasCtx = null    // canvas 2D 컨텍스트 — 한 번만 획득해서 캐싱
  let rendering = false   // 현재 렌더링 중인지 여부 (렌더링 큐잉 제어용)
  let renderRunId = 0     // 오래된 렌더 finally가 최신 렌더 상태를 건드리지 않도록 구분한다
  let pendingPage = null  // 렌더링 중 요청된 다음 페이지 번호 (큐잉 패턴)
  let resizeTimer = null  // 리사이즈 디바운스용 타이머 ID
  let fileReader = null   // 현재 FileReader — 빠른 파일 교체 시 오래된 읽기를 중단한다
  let openToken = 0       // 비동기 open/render 결과 중 오래된 작업을 무시하기 위한 토큰
  let disposed = false    // 컴포저블 정리 이후 비동기 콜백 무시용 플래그

  /* ── 반응성 상태 (UI 바인딩용) ── */
  const currentPage = ref(1)      // 현재 표시 중인 페이지 번호
  const totalPages = ref(0)       // PDF 총 페이지 수
  const loopMode = ref(false);    // 루프 모드 여부
  const fileLoaded = ref(false)   // PDF 파일이 로드되었는지 여부 (탭존, 스트립 표시 제어)
  const isLoading = ref(false)    // 로딩 오버레이 표시 여부

  /* ── 숨겨진 파일 입력 ── */
  let fileInput = null  // <input type="file"> 요소 — DOM에 한 번만 생성

  /**
   * <input type="file">을 지연 생성한다.
   * 처음 openFile()이 호출될 때 한 번만 DOM에 추가되고,
   * 이후에는 같은 요소를 재사용한다.
   */
  function ensureFileInput() {
    // 이미 생성된 input이 있다면 재사용한다.
    if (fileInput) return fileInput

    // DOM에 보이지 않는 input 엘리먼트를 생성한다.
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'application/pdf'
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)

    // 파일 선택 완료 시 실행될 이벤트를 바인딩한다.
    fileInput.addEventListener('change', handleFileChange)
    return fileInput
  }

  /** 파일 선택 다이얼로그를 연다. */
  function openFile() {
    ensureFileInput().click()
  }

  /**
   * 파일 선택 후 호출되는 콜백.
   * FileReader로 ArrayBuffer를 읽은 뒤 loadPDF()에 전달한다.
   * e.target.value = '' 로 초기화해야 같은 파일을 다시 선택할 수 있다.
   */
  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return

    // 새 파일 읽기 시작 전, 고유 토큰을 발급하여 이전 작업과 구분한다.
    const token = ++openToken

    // 이미 진행 중인 파일 읽기가 있다면 중단(abort)한다.
    if (fileReader?.readyState === FileReader.LOADING) {
      fileReader.abort()
    }

    const reader = new FileReader()
    fileReader = reader

    reader.onload = (ev) => {
      // 컴포넌트가 언마운트되었거나, 새 파일을 연 경우 이전 결과를 무시한다.
      if (disposed || token !== openToken) return
      loadPDF(ev.target.result, token)
    }

    reader.onerror = () => {
      if (!disposed && token === openToken) {
        alert('Could not read PDF file.')
      }
    }

    reader.onloadend = () => {
      // 이 reader가 현재 활성 reader라면 참조를 해제한다.
      if (fileReader === reader) fileReader = null
    }

    // 메모리 로드를 위해 바이너리 버퍼 형태로 읽는다.
    reader.readAsArrayBuffer(file)

    // 같은 파일을 다시 열 수 있도록 input 값을 초기화한다.
    e.target.value = ''
  }

  /**
   * 캔버스 요소의 크기를 0으로 만들어 비운다.
   * 메모리 누수를 방지하고 이전 문서의 잔상을 지우는 역할을 한다.
   */
  function clearCanvas() {
    const canvas = canvasRef.value
    if (!canvas) return
    canvas.width = 0
    canvas.height = 0
    canvas.style.width = ''
    canvas.style.height = ''
    canvasCtx = null
  }

  /**
   * 문서와 관련된 반응성 상태(페이지 번호, 로딩 상태 등)를 초기화한다.
   */
  function resetViewerState() {
    currentPage.value = 1
    totalPages.value = 0
    fileLoaded.value = false
  }

  /**
   * 진행 중인 모든 PDF.js 태스크(로딩, 렌더링)를 취소하고 정리한다.
   * clear 파라미터가 true일 경우 캔버스와 UI 상태도 함께 초기화한다.
   * 
   * @param {Object} options
   * @param {boolean} options.clear - 화면 및 상태도 함께 지울지 여부
   */
  async function cleanupCurrentPDF({ clear = false } = {}) {
    // 큐에 대기 중인 페이지 렌더링 요청을 취소한다.
    pendingPage = null

    // 현재 진행 중인 태스크들의 참조를 지역 변수로 복사하고,
    // 전역 상태는 즉시 null로 초기화하여 새 렌더링/로딩이 겹치지 않게 한다.
    const taskToCancel = renderTask
    const taskToDestroy = loadingTask
    renderTask = null
    renderRunId++ // 진행 중이던 렌더링의 finally 블록이 동작하지 못하게 막는다.
    rendering = false
    loadingTask = null
    pdfDoc = null

    // clear 플래그가 참이면 화면(UI)도 완전히 초기화한다.
    if (clear) {
      resetViewerState()
      clearCanvas()
    }

    // 1) 진행 중이던 렌더링 태스크 취소
    if (taskToCancel) {
      try {
        taskToCancel.cancel()
      } catch (err) {
        console.error('Could not cancel PDF render task:', err)
      }
      try {
        // 취소가 완료될 때까지 기다린다.
        await taskToCancel.promise
      } catch {
        // 파일 교체 중 렌더 취소로 promise가 reject되는 것은 정상 흐름이다.
      }
    }

    // 2) 진행 중이거나 완료된 로딩 태스크(문서 객체) 파기
    if (taskToDestroy) {
      try {
        await taskToDestroy.destroy()
      } catch (err) {
        console.error('Could not destroy PDF loading task:', err)
      }
    }
  }

  /**
   * 현재 열려있는 파일을 닫고 뷰어 상태를 초기화한다.
   * 진행 중인 렌더링이나 파싱 작업도 모두 취소/정리된다.
   */
  function closeFile() {
    cleanupCurrentPDF({ clear: true });
  };

  /**
   * ArrayBuffer 형태의 PDF 바이너리 데이터를 받아 문서를 PDF.js로 파싱하고 첫 페이지를 렌더링한다.
   * pdfDoc에 PDF.js 문서 객체를 저장한다 (일반 변수, ref 아님).
   * 이전에 열린 PDF가 있으면 destroy()로 리소스를 해제한 후 교체한다.
   * 
   * @param {ArrayBuffer} data - PDF 바이너리 데이터
   * @param {number} token - 비동기 충돌 방지용 고유 토큰
   */
  async function loadPDF(data, token = openToken) {
    isLoading.value = true
    let task = null
    let docLoaded = false

    try {
      // 기존에 열려있는 문서와 렌더링을 모두 정리하고 기다린다.
      await cleanupCurrentPDF({ clear: true })

      // 그 사이 컴포넌트가 언마운트되거나 새 파일이 열렸으면 중단한다.
      if (disposed || token !== openToken) return

      // PDF.js 워커를 이용해 문서를 파싱한다.
      task = getDocument({ data })
      loadingTask = task
      const doc = await task.promise

      // 파싱이 끝났는데 그 사이 다른 동작이 발생했다면 로드한 문서를 즉시 파기한다.
      if (disposed || token !== openToken) {
        try {
          await task.destroy()
        } finally {
          if (loadingTask === task) loadingTask = null
        }
        return
      }

      // 파싱 성공 처리: 전역 상태에 문서와 페이지 정보를 저장한다.
      docLoaded = true
      pdfDoc = doc
      totalPages.value = pdfDoc.numPages
      currentPage.value = 1
      fileLoaded.value = true

      // 첫 번째 페이지 렌더링을 시작한다.
      await renderPage(1, token)
    } catch (err) {
      // 예외 발생 시, 생성 중이던 태스크가 있다면 파기하여 메모리 누수를 막는다.
      if (!docLoaded && task && loadingTask === task) {
        loadingTask = null
        try {
          await task.destroy()
        } catch (destroyErr) {
          console.error('Could not destroy failed PDF loading task:', destroyErr)
        }
      }

      if (!disposed && token === openToken) {
        alert('Could not open PDF: ' + err.message)
      }
    } finally {
      // 최종적으로 로딩 오버레이를 닫는다.
      if (!disposed && token === openToken) {
        isLoading.value = false
      }
    }
  }

  /**
   * ── 페이지 렌더링 (pendingPage 큐잉 패턴) ──
   *
   * 렌더링은 비동기(await)이므로, 렌더링 중에 새 페이지 요청이 들어오면
   * pendingPage에 저장해뒀다가 현재 렌더링이 끝난 후 이어서 처리한다.
   * 빠른 연속 탭에서 중간 페이지를 건너뛰고 마지막 요청만 렌더링하는 효과가 있다.
   * 
   * @param {number} num - 렌더링할 페이지 번호
   * @param {number} token - 비동기 충돌 방지용 고유 토큰
   */
  async function renderPage(num, token = openToken) {
    // 이미 렌더링 중이면 — 요청을 큐에 저장하고 리턴
    if (rendering) {
      pendingPage = { num, token }
      return
    }
    rendering = true
    const runId = ++renderRunId

    const canvas = canvasRef.value
    const wrapEl = viewerWrapRef.value
    if (!canvas || !wrapEl || !pdfDoc || disposed || token !== openToken) {
      if (runId === renderRunId) rendering = false
      return
    }

    // canvas 2D 컨텍스트를 한 번만 획득하고 이후에는 캐싱된 값을 재사용한다.
    // getContext('2d')는 같은 객체를 반환하지만, 매번 호출할 필요는 없다.
    if (!canvasCtx) {
      canvasCtx = canvas.getContext('2d')
    }

    let task = null

    try {
      // 비동기로 해당 페이지의 데이터(Proxy)를 가져온다.
      const page = await pdfDoc.getPage(num)

      // 그 사이 컴포넌트가 언마운트되거나 새 파일이 열렸으면 중단한다.
      if (disposed || token !== openToken) return

      /*
       * 스케일 계산:
       * 1) 원본 뷰포트(scale=1)로 PDF 페이지의 실제 크기를 구한다.
       * 2) 뷰어 컨테이너에 맞게 축소/확대 비율을 계산한다 (contain 방식).
       * 3) devicePixelRatio를 곱해서 고해상도 디스플레이에서 선명하게 렌더링한다.
       *    → canvas의 내부 해상도는 크게, CSS 표시 크기는 실제 픽셀로 설정.
       */
      const vp0 = page.getViewport({ scale: 1 })
      const wrap = wrapEl.getBoundingClientRect()

      // 컨테이너 안에 딱 맞게 들어가도록 가로/세로 중 더 빡빡한 비율을 선택한다.
      const scale =
        Math.min(wrap.width / vp0.width, wrap.height / vp0.height) *
        window.devicePixelRatio

      // 최종 스케일이 적용된 뷰포트 객체를 생성한다.
      const vp = page.getViewport({ scale })

      // canvas 내부 해상도 (실제 픽셀 수)
      canvas.width = vp.width
      canvas.height = vp.height
      // canvas CSS 크기 (화면에 표시되는 크기) — devicePixelRatio로 나눠서 논리 픽셀로 변환
      canvas.style.width = vp.width / window.devicePixelRatio + 'px'
      canvas.style.height = vp.height / window.devicePixelRatio + 'px'

      // 렌더 태스크를 생성하고 시작한다.
      task = page.render({ canvasContext: canvasCtx, viewport: vp })
      renderTask = task

      // 렌더링 완료를 기다린다.
      await task.promise

      // 완료 후 전역 태스크 참조를 지우고 페이지 프록시를 정리한다.
      if (renderTask === task) renderTask = null
      page.cleanup()

      // 렌더링이 성공적으로 끝나면 UI의 현재 페이지 번호를 업데이트한다.
      if (!disposed && token === openToken) {
        currentPage.value = num
      }
    } catch (err) {
      // 렌더링 중 취소된 예외는 정상 흐름이므로 무시하고, 그 외의 에러만 기록한다.
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Could not render PDF page:', err)
      }
    } finally {
      if (renderTask === task) renderTask = null
      if (runId !== renderRunId) return
      rendering = false

      // 렌더링 중에 큐잉된 페이지가 있으면 이어서 렌더링
      const pending = pendingPage
      pendingPage = null
      if (pending && !disposed && pending.token === openToken) {
        renderPage(pending.num, pending.token)
      }
    }
  }

  /* ── 페이지 이동 ── */
  /** 루프 모드 토글 */
  function toggleLoopMode() {
    loopMode.value = !loopMode.value;
  };

  /** 지정한 페이지로 이동. 루프모드가 아닐 때는 범위를 벗어나면 무시한다. */
  function goToPage(n) {
    if (!pdfDoc) return
    if (n < 1 || n > totalPages.value) {
      if (!loopMode.value) {
        return;
      } else if (n < 1) {
        n = totalPages.value;
      } else if (n > totalPages.value) {
        n = 1;
      }
    }
    renderPage(n, openToken)
  }

  /** 이전 페이지로 이동. */
  function prevPage() {
    goToPage(currentPage.value - 1)
  }

  /** 다음 페이지로 이동. */
  function nextPage() {
    goToPage(currentPage.value + 1)
  }

  /**
   * ── 키보드 내비게이션 ──
   * 블루투스 페이지 터너(보면대 페달 등)는 키보드 이벤트를 전송하므로,
   * 별도 API 없이 이 리스너로 자동 지원된다.
   * 
   * @param {KeyboardEvent} e
   */
  function handleKeydown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage()
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage()
  }

  /**
   * ── 리사이즈 핸들러 ──
   * 화면 크기 변경 시 200ms 디바운스 후 현재 페이지를 다시 렌더링한다.
   * 태블릿 회전(가로↔세로) 시 캔버스 크기를 재계산하기 위함.
   */
  function handleResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (pdfDoc) renderPage(currentPage.value, openToken)
    }, 200)
  }

  /* ── 라이프사이클 ── */

  // 컴포넌트 마운트 시 전역 이벤트 리스너 등록
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    window.addEventListener('resize', handleResize)
  })

  // 컴포넌트 언마운트 시 정리 — 메모리 누수 방지
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('resize', handleResize)
    clearTimeout(resizeTimer)
    disposed = true
    openToken++
    if (fileReader?.readyState === FileReader.LOADING) {
      fileReader.abort()
    }
    fileReader = null
    cleanupCurrentPDF({ clear: true })
    if (fileInput) {
      fileInput.removeEventListener('change', handleFileChange)
      fileInput.remove()
      fileInput = null
    }
  })

  /* ── 외부에 노출하는 API ── */
  return {
    currentPage,    // ref<number> — 현재 페이지 (읽기/쓰기)
    totalPages,     // ref<number> — 총 페이지 수 (읽기 전용으로 사용)
    loopMode,       // ref<boolean> — 루프 모드 여부
    fileLoaded,     // ref<boolean> — 파일 로드 여부
    isLoading,      // ref<boolean> — 로딩 중 여부
    openFile,       // () => void — 파일 선택 다이얼로그 열기
    closeFile,      // () => void — 현재 열려있는 파일 닫기
    toggleLoopMode, // () => void — 루프 모드 토글
    goToPage,       // (n: number) => void — 특정 페이지로 이동
    prevPage,       // () => void — 이전 페이지
    nextPage,       // () => void — 다음 페이지
  }
}
