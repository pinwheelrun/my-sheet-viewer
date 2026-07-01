/**
 * usePdfRenderer — all PDF.js rendering logic.
 *
 * pdfDoc is kept as a plain `let` outside Vue reactivity because
 * PDF.js objects break under Vue's proxy. Only UI-driving state
 * (currentPage, totalPages, fileLoaded, isLoading) is reactive.
 */

import { ref, onMounted, onUnmounted } from 'vue'
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import PDFWorker from 'pdfjs-dist/build/pdf.worker.mjs?url'

GlobalWorkerOptions.workerSrc = PDFWorker

/**
 * @param {import('vue').ShallowRef<HTMLCanvasElement|null>} canvasRef
 * @param {import('vue').ShallowRef<HTMLElement|null>} viewerWrapRef
 */
export function usePdfRenderer(canvasRef, viewerWrapRef) {
  /* ── Plain variables (outside reactivity) ── */
  let pdfDoc = null
  let rendering = false
  let pendingPage = null
  let resizeTimer = null

  /* ── Reactive UI state ── */
  const currentPage = ref(1)
  const totalPages = ref(0)
  const fileLoaded = ref(false)
  const isLoading = ref(false)

  /* ── Hidden file input (created once, never reactive) ── */
  let fileInput = null

  function ensureFileInput() {
    if (fileInput) return fileInput
    fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = 'application/pdf'
    fileInput.style.display = 'none'
    document.body.appendChild(fileInput)
    fileInput.addEventListener('change', handleFileChange)
    return fileInput
  }

  /* ── File handling ── */
  function openFile() {
    ensureFileInput().click()
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => loadPDF(ev.target.result)
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function loadPDF(data) {
    isLoading.value = true

    try {
      pdfDoc = await getDocument({ data }).promise
      totalPages.value = pdfDoc.numPages
      currentPage.value = 1
      fileLoaded.value = true

      await renderPage(1)
    } catch (err) {
      alert('Could not open PDF: ' + err.message)
    } finally {
      isLoading.value = false
    }
  }

  /* ── Page rendering with pending-page queue ── */
  async function renderPage(num) {
    if (rendering) {
      pendingPage = num
      return
    }
    rendering = true

    const canvas = canvasRef.value
    const wrapEl = viewerWrapRef.value
    if (!canvas || !wrapEl || !pdfDoc) {
      rendering = false
      return
    }

    const ctx = canvas.getContext('2d')
    const page = await pdfDoc.getPage(num)
    const vp0 = page.getViewport({ scale: 1 })
    const wrap = wrapEl.getBoundingClientRect()
    const scale =
      Math.min(wrap.width / vp0.width, wrap.height / vp0.height) *
      window.devicePixelRatio

    const vp = page.getViewport({ scale })
    canvas.width = vp.width
    canvas.height = vp.height
    canvas.style.width = vp.width / window.devicePixelRatio + 'px'
    canvas.style.height = vp.height / window.devicePixelRatio + 'px'

    await page.render({ canvasContext: ctx, viewport: vp }).promise

    currentPage.value = num
    rendering = false

    if (pendingPage !== null) {
      const p = pendingPage
      pendingPage = null
      renderPage(p)
    }
  }

  /* ── Navigation ── */
  function goToPage(n) {
    if (!pdfDoc || n < 1 || n > totalPages.value) return
    renderPage(n)
  }

  function prevPage() {
    goToPage(currentPage.value - 1)
  }

  function nextPage() {
    goToPage(currentPage.value + 1)
  }

  /* ── Keyboard navigation ── */
  function handleKeydown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevPage()
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextPage()
  }

  /* ── Resize handler ── */
  function handleResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (pdfDoc) renderPage(currentPage.value)
    }, 200)
  }

  /* ── Lifecycle ── */
  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
    window.removeEventListener('resize', handleResize)
    clearTimeout(resizeTimer)
    if (fileInput) {
      fileInput.removeEventListener('change', handleFileChange)
      fileInput.remove()
      fileInput = null
    }
  })

  return {
    currentPage,
    totalPages,
    fileLoaded,
    isLoading,
    openFile,
    goToPage,
    prevPage,
    nextPage,
  }
}
