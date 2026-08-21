<template>
  <div class="h-full flex flex-col bg-[#050505] w-full relative">
    
    <!-- HEADER COMPATTO -->
    <div class="px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0 z-20 bg-[#050505] flex justify-between items-center">
      <div class="flex items-center gap-6">
        <h2 class="text-xs font-bold tracking-widest text-gray-500 uppercase m-0">PDF</h2>
        
        <div class="flex items-center bg-[#111] rounded-md border border-[#222] overflow-hidden">
          <button @click="changeZoom(-0.2)" :disabled="!currentPdf" class="px-3 py-1 text-gray-400 hover:bg-[#222] hover:text-white disabled:opacity-50 transition-colors font-mono font-bold">-</button>
          <span class="px-3 py-1 text-xs text-gray-300 font-mono bg-[#1a1a1a]">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="changeZoom(0.2)" :disabled="!currentPdf" class="px-3 py-1 text-gray-400 hover:bg-[#222] hover:text-white disabled:opacity-50 transition-colors font-mono font-bold">+</button>
        </div>
      </div>

      <label class="cursor-pointer m-0 flex items-center gap-3">
        <span v-if="fileName" class="text-xs text-gray-500 max-w-[150px] truncate">{{ fileName }}</span>
        <span class="text-xs font-bold uppercase tracking-wider bg-[#1a1a1a] text-white py-2 px-4 rounded hover:bg-[#2a2a2a] hover:text-[#E62828] transition-colors">
          Scegli File
        </span>
        <input type="file" accept="application/pdf" @change="onFileChange" class="hidden" />
      </label>
    </div>

    <!-- CONTENITORE PDF -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden p-4 relative flex flex-col items-center bg-[#0a0a0a] w-full">
      <div v-if="isLoading" class="text-[#E62828] text-sm animate-pulse mt-10 font-mono uppercase tracking-widest">Calcolo Hitbox...</div>
      
      <div 
        v-for="(pageData, index) in pages" 
        :key="index" 
        class="relative mb-8 shadow-2xl bg-white flex-shrink-0" 
        :style="{ width: pageData.cssWidth + 'px', height: pageData.cssHeight + 'px' }"
      >
        <!-- Canvas Immagine -->
        <canvas 
          :ref="el => setCanvasRef(el, index)" 
          class="absolute top-0 left-0 z-0 w-full h-full"
        ></canvas>
        
        <!-- Text Layer Geometrico Puro (Solo Div vuoti!) -->
        <div class="absolute top-0 left-0 w-full h-full z-10">
           <template v-if="pageData.rendered">
             <!-- Disegniamo direttamente la Hitbox matematica -->
             <div 
               v-for="(box, bIdx) in pageData.hitboxes" 
               :key="bIdx"
               @click="onWordClick(box.index)"
               class="absolute cursor-pointer transition-colors rounded-[2px]"
               :style="{
                 left: box.left + 'px',
                 top: box.top + 'px',
                 width: box.width + 'px',
                 height: box.height + 'px'
               }"
               :class="isCurrentWord(box.index) ? 'bg-[#E62828]/40' : 'hover:bg-yellow-400/30'"
             ></div>
           </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, markRaw } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'

const store = useRsvpStore()
const isLoading = ref(false)
const pages = ref([])
const canvasRefs = ref([])

// Stato aggiuntivo per Zoom e File
const currentPdf = ref(null)
const zoomLevel = ref(1.0)
const fileName = ref('')

const setCanvasRef = (el, index) => {
  if (el) canvasRefs.value[index] = el
}

const isCurrentWord = (globalIndex) => {
  return store.currentIndex === globalIndex
}

const onWordClick = (globalIndex) => {
  store.currentIndex = globalIndex
  if (store.isPlaying) store.isPlaying = false 
}

// Gestione dello Zoom (ricarica le pagine col nuovo livello)
const changeZoom = async (delta) => {
  if (!currentPdf.value) return
  // Limiti di zoom: min 50%, max 250%
  zoomLevel.value = Math.max(0.5, Math.min(2.5, zoomLevel.value + delta))
  await processDocument(currentPdf.value, false) // false = non ricreare lo store RSVP
}

const onFileChange = async (event) => {
  const file = event.target.files[0]
  if (!file || file.type !== 'application/pdf') return

  fileName.value = file.name
  isLoading.value = true
  
  try {
    const pdfjsLib = await import('pdfjs-dist')
    const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default

    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      useSystemFonts: true 
    })
    
    const pdf = await loadingTask.promise
    currentPdf.value = markRaw(pdf) // Salviamo il PDF per lo Zoom
    zoomLevel.value = 1.0 // Reset zoom
    
    await processDocument(currentPdf.value, true)

  } catch (error) {
    console.error("Errore PDF.js:", error)
    alert("Errore nel caricamento del PDF.")
    isLoading.value = false
  }
}

const processDocument = async (pdf, reloadText = true) => {
  isLoading.value = true
  pages.value = []
  canvasRefs.value = []

  try {
    let globalWordArray = []
    let globalWordIndex = 0

    const containerBaseWidth = (window.innerWidth / 2) - 32 
    const targetWidth = containerBaseWidth * zoomLevel.value

    // Creiamo un canvas "fantasma" per misurare la larghezza esatta delle parole
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

        // 1. Convertiamo le coordinate di INIZIO e FINE riga in pixel su schermo
        const [startX, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5])
        const [endX, _] = viewport.convertToViewportPoint(item.transform[4] + item.width, item.transform[5])
        
        // Questa è la larghezza matematica esatta della riga stampata sul PDF
        const screenWidth = endX - startX 

        const fontSize = Math.sqrt((item.transform[2] ** 2) + (item.transform[3] ** 2)) * viewport.scale
        
        // 2. Misuriamo la riga col nostro font locale
        measureCtx.font = `${fontSize}px sans-serif`
        const measuredTotalWidth = measureCtx.measureText(item.str).width
        
        // 3. Il trucco magico: il Rapporto di Correzione. 
        // Assorbe qualsiasi differenza tra il font del PDF e il nostro font locale!
        const widthRatio = measuredTotalWidth > 0 ? (screenWidth / measuredTotalWidth) : 1

        // 4. Splittiamo in parole
        const parts = item.str.split(/(\s+)/)
        let currentX = startX

        for (const part of parts) {
          if (part.length === 0) continue
          
          // Misuriamo la singola parola e applichiamo la correzione matematica
          const partWidth = measureCtx.measureText(part).width * widthRatio
          
          if (part.trim().length > 0) {
            pageHitboxes.push({
              left: currentX,
              top: y - (fontSize * 0.85), // Alziamo un po' dalla baseline per coprire le maiuscole
              width: partWidth,
              height: fontSize * 1.3,     // Abbassiamo per le lettere come 'p' o 'q'
              index: globalWordIndex
            })
            if (reloadText) globalWordArray.push(part)
            globalWordIndex++
          }
          
          // Avanziamo la X per la parola/spazio successivo
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
        hitboxes: pageHitboxes, // Non abbiamo più le stringhe, solo i box geometrici
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

    const renderContext = {
      canvasContext: context,
      transform: pageData.transform,
      viewport: pageData.viewport
    }
    
    try {
      await pageData.pageObject.render(renderContext).promise 
      pageData.rendered = true
    } catch (err) {
      console.error(`Errore rendering pagina ${pageData.pageNumber}:`, err)
    }
  }
}
</script>
