<template>
  <div 
    class="h-full flex flex-col bg-[#050505] w-full relative transition-colors duration-300"
    :class="{ 'bg-[#1a1a1a] border-2 border-dashed border-[#E62828]': isDragging }"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
  >
    <!-- OVERLAY DRAG & DROP -->
    <div v-if="isDragging" class="absolute inset-0 z-50 flex items-center justify-center pointer-events-none backdrop-blur-sm">
      <h2 class="text-3xl font-bold text-white tracking-widest uppercase bg-black/50 px-8 py-4 rounded-xl">Rilascia il file qui</h2>
    </div>

    <!-- HEADER UNIVERSALE -->
    <div class="px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0 z-20 bg-[#050505] flex justify-between items-center">
      <div class="flex items-center gap-4">
        <h2 class="text-xs font-bold tracking-widest text-gray-500 uppercase m-0">
          {{ viewMode === 'pdf' ? 'PDF' : (viewMode === 'text' ? 'TESTO' : 'DOCUMENTO') }}
        </h2>
        
        <!-- Controlli Zoom (Solo PDF) -->
        <div v-if="viewMode === 'pdf'" class="flex items-center bg-[#111] rounded-md border border-[#222] overflow-hidden">
          <button @click="changeZoom(-0.2)" :disabled="!currentPdf" class="px-3 py-1 text-gray-400 hover:bg-[#222] hover:text-white transition-colors font-mono font-bold">-</button>
          <span class="px-3 py-1 text-xs text-gray-300 font-mono bg-[#1a1a1a]">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="changeZoom(0.2)" :disabled="!currentPdf" class="px-3 py-1 text-gray-400 hover:bg-[#222] hover:text-white transition-colors font-mono font-bold">+</button>
        </div>
      </div>

      <!-- Azioni Rapide -->
      <div class="flex items-center gap-3">
        <button @click="openPasteArea" class="text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors">
          📝 Incolla Testo
        </button>
        <label class="cursor-pointer m-0 flex items-center gap-3">
          <span v-if="fileName" class="text-xs text-gray-500 max-w-[150px] truncate">{{ fileName }}</span>
          <span class="text-xs font-bold uppercase tracking-wider bg-[#1a1a1a] text-white py-2 px-4 rounded hover:bg-[#2a2a2a] hover:text-[#E62828] transition-colors">
            Carica File
          </span>
          <input type="file" accept="application/pdf, text/plain, .epub" @change="onFileChange" class="hidden" />
        </label>
      </div>
    </div>

    <!-- AREA DI CONTENUTO PRINCIPALE -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col items-center bg-[#0a0a0a] w-full p-4">
      
      <!-- STATO: Incolla Testo -->
      <div v-if="viewMode === 'paste'" class="w-full max-w-2xl mt-10 flex flex-col gap-4">
        <h3 class="text-white font-bold tracking-wide">Incolla il tuo testo qui:</h3>
        <textarea 
          v-model="pastedText" 
          class="w-full h-96 bg-[#111] text-gray-300 p-6 border border-[#333] rounded-lg focus:outline-none focus:border-[#E62828] resize-none font-mono text-sm leading-relaxed"
          placeholder="C'era una volta..."
        ></textarea>
        <div class="flex justify-end gap-4">
          <button @click="viewMode = 'idle'" class="px-6 py-2 text-gray-500 hover:text-white">Annulla</button>
          <button @click="processRawText(pastedText)" class="px-6 py-2 bg-[#E62828] text-white font-bold rounded hover:bg-red-600">Inizia Lettura</button>
        </div>
      </div>

      <!-- STATO: Testo Semplice (TXT o Incollato) -->
      <div v-else-if="viewMode === 'text'" class="w-full max-w-3xl mt-4 p-8 bg-[#111] rounded-xl shadow-2xl text-gray-300 text-lg leading-relaxed font-serif whitespace-pre-wrap">
        <span 
          v-for="(wordObj, idx) in textWords" 
          :key="idx"
          @click="onWordClick(idx)"
          class="cursor-pointer transition-colors rounded-sm"
          :class="isCurrentWord(idx) ? 'bg-[#E62828] text-white px-1' : 'hover:bg-yellow-400/30'"
        >{{ wordObj.text + (wordObj.hasSpace ? ' ' : '') }}</span>
      </div>

      <!-- STATO: PDF -->
      <template v-else-if="viewMode === 'pdf'">
        <div v-if="isLoading" class="text-[#E62828] text-sm animate-pulse mt-10 font-mono uppercase tracking-widest">Elaborazione...</div>
        
        <div 
          v-for="(pageData, index) in pages" 
          :key="index" 
          class="relative mb-8 shadow-2xl bg-white flex-shrink-0" 
          :style="{ width: pageData.cssWidth + 'px', height: pageData.cssHeight + 'px' }"
        >
          <!-- Canvas PDF -->
          <canvas :ref="el => setCanvasRef(el, index)" class="absolute top-0 left-0 z-0 w-full h-full"></canvas>
          
          <!-- Text Layer con FIX CURSORE ANTI-FLICKER -->
          <div class="absolute top-0 left-0 w-full h-full z-10">
             <template v-if="pageData.rendered">
               
               <!-- 1. Il Cursore Singolo Attivo (Nessun flickering!) -->
               <div 
                 v-if="hasActiveWord(pageData)"
                 class="absolute bg-[#E62828]/40 pointer-events-none rounded-[2px]"
                 :style="getActiveWordStyle(pageData)"
               ></div>

               <!-- 2. Le Hitbox Statiche (Nessuna classe reattiva pesante) -->
               <div 
                 v-for="(box, bIdx) in pageData.hitboxes" 
                 :key="bIdx"
                 @click="onWordClick(box.index)"
                 class="absolute cursor-pointer hover:bg-yellow-400/30 rounded-[2px]"
                 :style="{ left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }"
               ></div>
               
             </template>
          </div>
        </div>
      </template>

      <!-- STATO: Vuoto -->
      <div v-else class="m-auto text-center text-gray-600 flex flex-col items-center gap-4">
        <svg class="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>Trascina qui un PDF o un file di Testo</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, markRaw } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'

const store = useRsvpStore()

// Stati Globali
const viewMode = ref('idle') // 'idle', 'pdf', 'text', 'paste'
const isDragging = ref(false)
const isLoading = ref(false)
const fileName = ref('')

// Stati PDF
const pages = ref([])
const canvasRefs = ref([])
const currentPdf = ref(null)
const zoomLevel = ref(1.0)

// Stati Testo
const pastedText = ref('')
const textWords = ref([])

const setCanvasRef = (el, index) => { if (el) canvasRefs.value[index] = el }
const isCurrentWord = (globalIndex) => store.currentIndex === globalIndex
const onWordClick = (globalIndex) => {
  store.currentIndex = globalIndex
  if (store.isPlaying) store.isPlaying = false 
}

// ------------------------------------------------------------------
// FIX FLICKERING: Logica del Cursore Singolo per il PDF
// ------------------------------------------------------------------
const hasActiveWord = (pageData) => {
  if (!pageData.hitboxes || pageData.hitboxes.length === 0) return false
  const first = pageData.hitboxes[0].index
  const last = pageData.hitboxes[pageData.hitboxes.length - 1].index
  return store.currentIndex >= first && store.currentIndex <= last
}

const getActiveWordStyle = (pageData) => {
  const box = pageData.hitboxes.find(b => b.index === store.currentIndex)
  if (!box) return {}
  return {
    left: box.left + 'px',
    top: box.top + 'px',
    width: box.width + 'px',
    height: box.height + 'px'
  }
}

// ------------------------------------------------------------------
// DRAG & DROP e GESTIONE FILE
// ------------------------------------------------------------------
const handleDrop = (e) => {
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) elaboraFile(file)
}

const onFileChange = (event) => {
  const file = event.target.files[0]
  if (file) elaboraFile(file)
}

const elaboraFile = async (file) => {
  fileName.value = file.name

  if (file.type === 'application/pdf') {
    viewMode.value = 'pdf'
    await loadPdf(file)
  } 
  else if (file.type === 'text/plain') {
    const reader = new FileReader()
    reader.onload = (e) => processRawText(e.target.result)
    reader.readAsText(file)
  } 
  else if (file.name.endsWith('.epub')) {
    alert("Hai caricato un ePub! Nel prossimo step integreremo epub.js per renderizzarlo correttamente.")
  } 
  else {
    alert("Formato non supportato. Usa PDF o TXT.")
  }
}

// ------------------------------------------------------------------
// MOTORE TESTO SEMPLICE (TXT e PASTE)
// ------------------------------------------------------------------
const openPasteArea = () => {
  fileName.value = 'Testo Incollato'
  pastedText.value = ''
  viewMode.value = 'paste'
}

const processRawText = (text) => {
  if (!text.trim()) return
  
  // Dividiamo il testo preservando la logica degli spazi
  const rawWords = text.trim().split(/\s+/)
  store.loadText(rawWords.join(' '))

  // Mappiamo le parole per il rendering cliccabile
  textWords.value = rawWords.map((word, index) => ({
    text: word,
    hasSpace: true
  }))

  viewMode.value = 'text'
}

// ------------------------------------------------------------------
// MOTORE PDF (Con Zoom e Hitbox Matematiche)
// ------------------------------------------------------------------
const changeZoom = async (delta) => {
  if (!currentPdf.value) return
  zoomLevel.value = Math.max(0.5, Math.min(2.5, zoomLevel.value + delta))
  await processPdfDocument(currentPdf.value, false) 
}

const loadPdf = async (file) => {
  isLoading.value = true
  try {
    const pdfjsLib = await import('pdfjs-dist')
    const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true })
    const pdf = await loadingTask.promise
    
    currentPdf.value = markRaw(pdf)
    zoomLevel.value = 1.0 
    await processPdfDocument(currentPdf.value, true)
  } catch (error) {
    console.error(error)
    alert("Errore nel caricamento del PDF.")
    isLoading.value = false
  }
}

const processPdfDocument = async (pdf, reloadText = true) => {
  isLoading.value = true
  pages.value = []
  canvasRefs.value = []

  try {
    let globalWordArray = []
    let globalWordIndex = 0

    const containerBaseWidth = (window.innerWidth / 2) - 32 
    const targetWidth = containerBaseWidth * zoomLevel.value

    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const unscaledViewport = page.getViewport({ scale: 1.0 })
      const scale = targetWidth / unscaledViewport.width
      const viewport = page.getViewport({ scale: scale })
      const outputScale = window.devicePixelRatio || 1

      const textContent = await page.getTextContent()
      const pageHitboxes = []

      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === '') continue

        const [startX, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5])
        const [endX, _] = viewport.convertToViewportPoint(item.transform[4] + item.width, item.transform[5])
        const screenWidth = endX - startX 
        const fontSize = Math.sqrt((item.transform[2] ** 2) + (item.transform[3] ** 2)) * viewport.scale
        
        measureCtx.font = `${fontSize}px sans-serif`
        const measuredTotalWidth = measureCtx.measureText(item.str).width
        const widthRatio = measuredTotalWidth > 0 ? (screenWidth / measuredTotalWidth) : 1

        const parts = item.str.split(/(\s+)/)
        let currentX = startX

        for (const part of parts) {
          if (part.length === 0) continue
          const partWidth = measureCtx.measureText(part).width * widthRatio
          
          if (part.trim().length > 0) {
            pageHitboxes.push({
              left: currentX,
              top: y - (fontSize * 0.85),
              width: partWidth,
              height: fontSize * 1.3,
              index: globalWordIndex
            })
            if (reloadText) globalWordArray.push(part)
            globalWordIndex++
          }
          currentX += partWidth
        }
      }
      
      pages.value.push({
        pageNumber: i,
        cssWidth: Math.floor(viewport.width),
        cssHeight: Math.floor(viewport.height),
        physicalWidth: Math.floor(viewport.width * outputScale),
        physicalHeight: Math.floor(viewport.height * outputScale),
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null,
        hitboxes: pageHitboxes,
        viewport: viewport,
        pageObject: markRaw(page), 
        rendered: false
      })
    }

    if (reloadText) store.loadText(globalWordArray.join(' '))
    setTimeout(() => renderPages(), 150)
  } finally {
    isLoading.value = false
  }
}

const renderPages = async () => {
  await nextTick()
  for (let i = 0; i < pages.value.length; i++) {
    const pageData = pages.value[i]
    const canvas = canvasRefs.value[i]
    if (!canvas) continue

    canvas.width = pageData.physicalWidth
    canvas.height = pageData.physicalHeight
    const context = canvas.getContext('2d')
    if (!context) continue

    try {
      await pageData.pageObject.render({ canvasContext: context, transform: pageData.transform, viewport: pageData.viewport }).promise 
      pageData.rendered = true
    } catch (err) {
      console.error(err)
    }
  }
}
</script>
