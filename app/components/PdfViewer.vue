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
          {{ viewMode.toUpperCase() }}
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
          <input type="file" accept="application/pdf, text/plain, .epub, .md" @change="onFileChange" class="hidden" />
        </label>
      </div>
    </div>

    <!-- AREA DI CONTENUTO PRINCIPALE -->
    <div class="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col items-center bg-[#0a0a0a] w-full p-4">
      
      <!-- STATO: Incolla Testo -->
      <div v-if="viewMode === 'paste'" class="w-full max-w-2xl mt-10 flex flex-col gap-4">
        <h3 class="text-white font-bold tracking-wide">Incolla il tuo testo (o Markdown) qui:</h3>
        <textarea 
          v-model="pastedText" 
          class="w-full h-96 bg-[#111] text-gray-300 p-6 border border-[#333] rounded-lg focus:outline-none focus:border-[#E62828] resize-none font-mono text-sm leading-relaxed"
          placeholder="Incolla qui appunti, articoli, capitoli o codice Markdown..."
        ></textarea>
        <div class="flex justify-end gap-4">
          <button @click="viewMode = 'idle'" class="px-6 py-2 text-gray-500 hover:text-white">Annulla</button>
          <button @click="processRawText(pastedText)" class="px-6 py-2 bg-[#E62828] text-white font-bold rounded hover:bg-red-600">Inizia Lettura</button>
        </div>
      </div>

      <!-- STATO: Testo Semplice o Markdown -->
      <div v-else-if="viewMode === 'text'" class="w-full max-w-3xl mt-4 p-8 bg-[#111] rounded-xl shadow-2xl text-gray-300 text-lg leading-relaxed font-serif whitespace-pre-wrap markdown-container" v-html="markdownHtml" @click="handleMarkdownClick" ref="markdownContainerRef">
      </div>

      <!-- STATO: EPUB -->
      <div v-else-if="viewMode === 'epub'" class="w-full h-full relative bg-white shadow-2xl overflow-hidden rounded-xl flex">
        
        <!-- SIDEBAR INDICE (a scomparsa) -->
        <div 
           class="absolute top-0 left-0 h-full bg-[#111] text-gray-300 w-80 z-40 transform transition-transform duration-300 shadow-2xl flex flex-col border-r border-[#222]"
           :class="showEpubSidebar ? 'translate-x-0' : '-translate-x-full'"
        >
           <div class="p-6 border-b border-[#222] flex justify-between items-center bg-[#050505]">
              <h3 class="text-white font-bold tracking-wider uppercase text-sm">Indice Capitoli</h3>
              <button @click="showEpubSidebar = false" class="text-gray-500 hover:text-[#E62828] font-bold text-xl leading-none">×</button>
           </div>
           <div class="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              <button 
                v-for="item in epubToc" 
                :key="item.id" 
                @click="goToEpubChapter(item.href)"
                class="w-full text-left py-3 px-4 rounded-lg hover:bg-[#222] hover:text-white transition-all text-sm leading-tight border-l-2 border-transparent"
                :class="{ 'bg-[#E62828]/10 text-[#E62828] border-[#E62828] font-bold': currentChapterName === item.label }"
              >
                {{ item.label.trim() }}
              </button>
              <div v-if="epubToc.length === 0" class="text-center text-gray-600 mt-10 text-sm">Nessun indice trovato</div>
           </div>
        </div>

        <!-- AREA LETTURA -->
        <div class="flex-1 w-full h-full relative flex flex-col">
           
           <!-- TOP BAR FLUTTUANTE -->
           <div class="absolute top-4 left-4 right-4 z-30 flex items-center gap-4 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-gray-100 transition-all">
              <button @click="showEpubSidebar = !showEpubSidebar" class="text-gray-600 hover:text-[#E62828] hover:bg-gray-100 p-2 rounded-xl transition-colors">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              </button>
              
              <div class="flex-1 flex flex-col justify-center overflow-hidden">
                 <span class="text-xs font-bold text-gray-800 uppercase tracking-widest truncate">{{ currentChapterName || fileName }}</span>
                 <div class="w-full h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                    <div class="h-full bg-[#E62828] transition-all duration-300 rounded-full" :style="{ width: readingProgress + '%' }"></div>
                 </div>
              </div>
              
              <span class="text-xs font-mono font-bold text-[#E62828] w-12 text-right">{{ Math.round(readingProgress) }}%</span>
           </div>

           <div v-if="isLoading" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95">
             <div class="w-12 h-12 border-4 border-gray-200 border-t-[#E62828] rounded-full animate-spin mb-4"></div>
             <span class="text-[#E62828] text-sm font-mono uppercase tracking-widest animate-pulse">Estrazione in corso...</span>
           </div>
           
           <div ref="epubContainerRef" class="epub-container w-full flex-1 p-4 pt-24 pb-10 overflow-hidden"></div>
        </div>
      </div>

      <!-- STATO: PDF -->
      <template v-else-if="viewMode === 'pdf'">
        <div v-if="isLoading" class="text-[#E62828] text-sm animate-pulse mt-10 font-mono uppercase tracking-widest">Elaborazione Spaziale...</div>
        
        <div 
          v-for="(pageData, index) in pages" 
          :key="index" 
          class="relative mb-8 shadow-2xl bg-white flex-shrink-0" 
          :style="{ width: pageData.cssWidth + 'px', height: pageData.cssHeight + 'px' }"
        >
          <canvas :ref="el => setCanvasRef(el, index)" class="absolute top-0 left-0 z-0 w-full h-full"></canvas>
          <div class="absolute top-0 left-0 w-full h-full z-10">
             <template v-if="pageData.rendered">
               <div v-if="hasActiveWord(pageData)" class="absolute bg-[#E62828]/40 pointer-events-none rounded-[2px]" :style="getActiveWordStyle(pageData)"></div>
               <div v-for="(box, bIdx) in pageData.hitboxes" :key="bIdx" @click="onWordClick(box.index)" class="absolute cursor-pointer hover:bg-yellow-400/30 rounded-[2px]" :style="{ left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }"></div>
             </template>
          </div>
        </div>
      </template>

      <!-- STATO: Vuoto -->
      <div v-else-if="viewMode === 'idle'" class="m-auto text-center text-gray-600 flex flex-col items-center gap-4">
        <svg class="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>Trascina qui un PDF, un file TXT, MD o un EPUB</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, markRaw, watch } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'
import { marked } from 'marked'

const store = useRsvpStore()

// Stati Globali
const viewMode = ref('idle') 
const isDragging = ref(false)
const isLoading = ref(false)
const fileName = ref('')

// Stati PDF
const pages = ref([])
const canvasRefs = ref([])
const currentPdf = ref(null)
const zoomLevel = ref(1.0)

// Stati Testo/Markdown
const pastedText = ref('')
const markdownHtml = ref('')
const markdownContainerRef = ref(null)

// Stati EPUB
const epubContainerRef = ref(null)
const currentEpub = ref(null)
const epubRendition = ref(null)
const epubToc = ref([])
const currentChapterName = ref('')
const readingProgress = ref(0)
const showEpubSidebar = ref(false)

const setCanvasRef = (el, index) => { if (el) canvasRefs.value[index] = el }
const onWordClick = (globalIndex) => {
  store.currentIndex = globalIndex
  if (store.isPlaying) store.isPlaying = false 
}

const hasActiveWord = (pageData) => {
  if (!pageData.hitboxes || pageData.hitboxes.length === 0) return false
  const first = pageData.hitboxes[0].index
  const last = pageData.hitboxes[pageData.hitboxes.length - 1].index
  return store.currentIndex >= first && store.currentIndex <= last
}

const getActiveWordStyle = (pageData) => {
  const box = pageData.hitboxes.find(b => b.index === store.currentIndex)
  if (!box) return {}
  return { left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }
}

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
  else if (file.type === 'text/plain' || file.name.endsWith('.md')) {
    const reader = new FileReader()
    reader.onload = (e) => processRawText(e.target.result)
    reader.readAsText(file)
  } 
  else if (file.name.endsWith('.epub') || file.type === 'application/epub+zip') {
    viewMode.value = 'epub'
    await loadEpub(file)
  } 
  else {
    alert("Formato non supportato. Usa PDF, TXT, MD o EPUB.")
  }
}

// ------------------------------------------------------------------
// MOTORE EPUB
// ------------------------------------------------------------------
const spineOffsets = ref({}) // Mappa section.index -> startIndex globale

// Funzione generica per camminare nel DOM (sia testo che EPUB) e mappare le parole
const walkDOM = (node, startIndex, wrapInSpans = false, docCls = "") => {
  let currentIndex = startIndex
  let wordsArray = []

  function walk(n) {
    if (n.nodeType === 3 || n.nodeType === 4) {
      const words = n.textContent.split(/(\s+)/)
      if (words.length === 1 && words[0] === '') return
      
      const fragment = wrapInSpans ? n.ownerDocument.createDocumentFragment() : null
      for (const word of words) {
        if (word.trim().length > 0) {
          if (wrapInSpans) {
            const span = n.ownerDocument.createElement('span')
            span.textContent = word
            span.dataset.index = currentIndex
            if (docCls) span.className = docCls
            fragment.appendChild(span)
          }
          wordsArray.push(word)
          currentIndex++
        } else if (word.length > 0) {
          if (wrapInSpans) fragment.appendChild(n.ownerDocument.createTextNode(word))
        }
      }
      if (wrapInSpans && n.parentNode) {
        n.parentNode.replaceChild(fragment, n)
      }
    } else if (n.nodeType === 1) {
      const tag = n.tagName ? n.tagName.toUpperCase() : ''
      if (tag !== 'SCRIPT' && tag !== 'STYLE') {
        const children = Array.from(n.childNodes)
        for (const child of children) { walk(child) }
      }
    }
  }

  walk(node)
  return { words: wordsArray, nextIndex: currentIndex }
}

const loadEpub = async (file) => {
  isLoading.value = true
  store.reset()

  try {
    const ePub = (await import('epubjs')).default
    const arrayBuffer = await file.arrayBuffer()
    
    if (currentEpub.value) currentEpub.value.destroy()
    currentEpub.value = markRaw(ePub(arrayBuffer))
    
    epubRendition.value = currentEpub.value.renderTo(epubContainerRef.value, {
      manager: 'continuous',
      flow: 'scrolled-doc',
      snap: false,
      width: '100%',
      height: '100%',
      allowScriptedContent: true
    })
    
    // ASPETTIAMO CHE L'EPUB ABBIA CARICATO LA SUA STRUTTURA
    await currentEpub.value.ready
    
    // Recupera l'Indice
    const nav = await currentEpub.value.loaded.navigation
    epubToc.value = nav.toc || []
    
    // Genera locazioni in background per la barra di progresso (usiamo 1600 per calcolo standard)
    currentEpub.value.locations.generate(1600).catch(() => {})
    
    let fullWordArray = []
    let currentIndex = 0
    const spine = currentEpub.value.spine
    spineOffsets.value = {}
    
    // Estrazione testo PRIMA di visualizzare, così spineOffsets è pronto!
    for (let i = 0; i < spine.length; i++) {
        const item = spine.get(i)
        spineOffsets.value[item.index] = currentIndex
        
        const doc = await item.load(currentEpub.value.load.bind(currentEpub.value))
        if (doc) {
          let bodyNode = null
          
          if (typeof doc === 'string') {
             const parser = new DOMParser()
             const parsed = parser.parseFromString(doc, "application/xhtml+xml")
             bodyNode = parsed.querySelector('body') || parsed.documentElement
          } else if (doc.nodeType === 9) {
             bodyNode = doc.querySelector('body') || doc.documentElement
          } else if (doc.nodeType === 1) {
             bodyNode = (doc.tagName && doc.tagName.toLowerCase() === 'body') ? doc : (doc.querySelector('body') || doc)
          } else {
             bodyNode = doc.body || doc.documentElement || doc
          }
          
          if (bodyNode && bodyNode.nodeType !== undefined) {
            const result = walkDOM(bodyNode, currentIndex, false)
            if (result.words.length === 0) {
               console.warn(`[EPUB Parsing] walkDOM ha estratto 0 parole per section ${item.index}. Uso fallback testuale.`)
               const rawText = bodyNode.textContent || ""
               const fallbackWords = rawText.split(/\s+/).filter(w => w.trim().length > 0)
               fullWordArray.push(...fallbackWords)
               currentIndex += fallbackWords.length
            } else {
               fullWordArray.push(...result.words)
               currentIndex = result.nextIndex
            }
          } else {
            console.warn(`[EPUB Parsing] bodyNode invalido per section ${item.index}`, doc)
          }
        } else {
          console.warn(`[EPUB Parsing] doc nullo o non caricato per section ${item.index}`)
        }
        item.unload()
    }
    
    store.loadText(fullWordArray.join(' '))

    // Registra Hook per mappare le parole quando una pagina viene renderizzata
    epubRendition.value.hooks.content.register((contents, rendition) => {
      console.log("[EPUB Hook] Triggered per contents:", contents)
      console.log("[EPUB Hook] Object keys in contents:", Object.keys(contents))
      
      let sectionIndex = contents.sectionIndex
      if (sectionIndex === undefined) {
         console.warn("[EPUB Hook] sectionIndex undefined. Controllo altre proprietà...")
         // Tentiamo di ricavare l'index dall'id del body o altri parametri
         if (contents.document && contents.document.body && contents.document.body.id) {
            console.log("Body ID:", contents.document.body.id)
         }
      }
      
      if (sectionIndex === undefined) {
        console.warn("[EPUB Hook] Impossibile ricavare sectionIndex in contents.")
        return
      }
      
      const startIndex = spineOffsets.value[sectionIndex]
      if (startIndex === undefined) {
        console.warn(`[EPUB Hook] Nessun startIndex trovato per section index: ${sectionIndex}. spineOffsets:`, spineOffsets.value)
        return
      }
      
      const iframeDoc = contents.document
      const bodyNode = iframeDoc.body || iframeDoc.documentElement
      if (!bodyNode || bodyNode.nodeType === undefined) {
        console.warn("[EPUB Hook] Iframe senza body o documentElement valido.")
        return
      }
      
      console.log(`[EPUB Hook] Avvolgo parole per section ${sectionIndex} partendo da startIndex ${startIndex}`)
      
      // Aggiungi stili
      contents.addStylesheetRules([
        [".epub-word", ["transition", "background-color 0.1s ease"]],
        [".epub-word:hover", ["background-color", "rgba(250, 204, 21, 0.3)"]],
        [".epub-word.active-word", ["background-color", "rgba(230, 40, 40, 0.4)"], ["border-radius", "4px"]]
      ])

      // Avvolgi le parole in Span cliccabili
      walkDOM(bodyNode, startIndex, true, "epub-word")

      iframeDoc.addEventListener('click', (e) => {
        if (e.target.classList.contains('epub-word') && e.target.dataset.index !== undefined) {
          onWordClick(parseInt(e.target.dataset.index, 10))
        }
      })
    })

    await epubRendition.value.display()
    
    // Ascolta gli spostamenti per aggiornare la top bar
    epubRendition.value.on('relocated', (location) => {
      // Aggiorna titolo capitolo
      const startHref = location.start.href
      const navItem = epubToc.value.find(item => startHref.includes(item.href) || item.href.includes(startHref))
      if (navItem) currentChapterName.value = navItem.label
      
      // Aggiorna progresso
      if (currentEpub.value.locations.length() > 0) {
        readingProgress.value = currentEpub.value.locations.percentageFromCfi(location.start.cfi) * 100
      }
    })

  } catch (error) {
    console.error("Errore caricamento EPUB:", error)
    alert("Errore nella lettura del file EPUB.")
  } finally {
    isLoading.value = false
  }
}

const prevEpubPage = () => { if (epubRendition.value) epubRendition.value.prev() }
const nextEpubPage = () => { if (epubRendition.value) epubRendition.value.next() }
const goToEpubChapter = (href) => {
  if (epubRendition.value) {
    epubRendition.value.display(href)
    showEpubSidebar.value = false
  }
}

// ------------------------------------------------------------------
// MOTORE TESTO SEMPLICE & MARKDOWN
// ------------------------------------------------------------------
const openPasteArea = () => {
  fileName.value = 'Testo Incollato'
  pastedText.value = ''
  viewMode.value = 'paste'
}

const handleMarkdownClick = (e) => {
  if (e.target.tagName === 'SPAN' && e.target.dataset.index !== undefined) {
    onWordClick(parseInt(e.target.dataset.index, 10))
  }
}

const updateMarkdownHighlight = (newIdx, oldIdx) => {
  if (viewMode.value !== 'text') return
  const container = markdownContainerRef.value
  if (!container) return
  
  if (oldIdx !== null && oldIdx !== undefined) {
    const oldSpan = container.querySelector(`span[data-index="${oldIdx}"]`)
    if (oldSpan) {
      oldSpan.className = "cursor-pointer transition-colors rounded-sm hover:bg-yellow-400/30"
    }
  }
  
  const newSpan = container.querySelector(`span[data-index="${newIdx}"]`)
  if (newSpan) {
    newSpan.className = "cursor-pointer transition-colors rounded-sm bg-[#E62828] text-white px-1"
  }
}

watch(() => store.currentIndex, (newIdx, oldIdx) => {
  updateMarkdownHighlight(newIdx, oldIdx)
  
  if (viewMode.value === 'epub' && epubRendition.value) {
    const contentsArr = epubRendition.value.getContents()
    if (contentsArr && contentsArr.length > 0) {
      let oldSpan = null
      let newSpan = null
      let targetContents = null
      
      for (const contents of contentsArr) {
        const iframeDoc = contents.document
        if (!oldSpan && oldIdx !== null && oldIdx !== undefined) {
          oldSpan = iframeDoc.querySelector(`.epub-word[data-index="${oldIdx}"]`)
        }
        if (!newSpan) {
          newSpan = iframeDoc.querySelector(`.epub-word[data-index="${newIdx}"]`)
          if (newSpan) targetContents = contents
        }
      }
      
      if (oldSpan) oldSpan.classList.remove('active-word')
      if (newSpan) {
        newSpan.classList.add('active-word')
        
        // Auto-Scroll Intelligente
        if (store.isPlaying && targetContents) {
          const rect = newSpan.getBoundingClientRect()
          const viewportHeight = targetContents.window.innerHeight || window.innerHeight
          // Se la parola sta per uscire dalla vista (top 20% o bottom 20%), centra
          if (rect.top < viewportHeight * 0.2 || rect.top > viewportHeight * 0.8) {
             newSpan.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    }
  }
})

const processRawText = (text) => {
  if (!text.trim()) return
  
  const html = marked.parse(text, { breaks: true })
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  
  const result = walkDOM(doc.body, 0, true, "cursor-pointer transition-colors rounded-sm hover:bg-yellow-400/30")
  
  markdownHtml.value = doc.body.innerHTML
  store.loadText(result.words.join(' '))
  viewMode.value = 'text'
  
  nextTick(() => {
    updateMarkdownHighlight(store.currentIndex, null)
  })
}

// ------------------------------------------------------------------
// MOTORE PDF (Minificato)
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
    const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer(), useSystemFonts: true })
    currentPdf.value = markRaw(await loadingTask.promise)
    zoomLevel.value = 1.0 
    await processPdfDocument(currentPdf.value, true)
  } catch (error) {
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
    const targetWidth = ((window.innerWidth / 2) - 32) * zoomLevel.value
    const measureCtx = document.createElement('canvas').getContext('2d')

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: targetWidth / page.getViewport({ scale: 1.0 }).width })
      const textContent = await page.getTextContent()
      const pageHitboxes = []

      for (const item of textContent.items) {
        if (!item.str || item.str.trim() === '') continue
        const [startX, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5])
        const screenWidth = viewport.convertToViewportPoint(item.transform[4] + item.width, item.transform[5])[0] - startX 
        const fontSize = Math.sqrt((item.transform[2] ** 2) + (item.transform[3] ** 2)) * viewport.scale
        
        measureCtx.font = `${fontSize}px sans-serif`
        const widthRatio = measureCtx.measureText(item.str).width > 0 ? (screenWidth / measureCtx.measureText(item.str).width) : 1

        const parts = item.str.split(/(\s+)/)
        let currentX = startX
        for (const part of parts) {
          if (part.length === 0) continue
          const partWidth = measureCtx.measureText(part).width * widthRatio
          if (part.trim().length > 0) {
            pageHitboxes.push({ left: currentX, top: y - (fontSize * 0.85), width: partWidth, height: fontSize * 1.3, index: globalWordIndex })
            if (reloadText) globalWordArray.push(part)
            globalWordIndex++
          }
          currentX += partWidth
        }
      }
      pages.value.push({
        pageNumber: i, cssWidth: Math.floor(viewport.width), cssHeight: Math.floor(viewport.height),
        physicalWidth: Math.floor(viewport.width * (window.devicePixelRatio || 1)),
        physicalHeight: Math.floor(viewport.height * (window.devicePixelRatio || 1)),
        transform: (window.devicePixelRatio || 1) !== 1 ? [(window.devicePixelRatio || 1), 0, 0, (window.devicePixelRatio || 1), 0, 0] : null,
        hitboxes: pageHitboxes, viewport, pageObject: markRaw(page), rendered: false
      })
    }
    if (reloadText) store.loadText(globalWordArray.join(' '))
    setTimeout(() => renderPages(), 150)
  } finally { isLoading.value = false }
}

const renderPages = async () => {
  await nextTick()
  for (let i = 0; i < pages.value.length; i++) {
    const p = pages.value[i]
    if (!canvasRefs.value[i]) continue
    canvasRefs.value[i].width = p.physicalWidth
    canvasRefs.value[i].height = p.physicalHeight
    try { await p.pageObject.render({ canvasContext: canvasRefs.value[i].getContext('2d'), transform: p.transform, viewport: p.viewport }).promise; p.rendered = true } catch {}
  }
}
</script>

<style>
/* CSS addizionale per gli elementi Markdown */
.markdown-container h1 { font-size: 2.25rem; font-weight: bold; margin-bottom: 1rem; color: #fff; }
.markdown-container h2 { font-size: 1.875rem; font-weight: bold; margin-bottom: 0.75rem; color: #fff; }
.markdown-container h3 { font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem; color: #fff; }
.markdown-container p { margin-bottom: 1rem; }
.markdown-container a { color: #E62828; text-decoration: underline; }
.markdown-container ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
.markdown-container ol { list-style-type: decimal; margin-left: 1.5rem; margin-bottom: 1rem; }
.markdown-container blockquote { border-left: 4px solid #333; padding-left: 1rem; color: #888; font-style: italic; }
.markdown-container code { background-color: #222; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; }
.markdown-container pre { background-color: #222; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin-bottom: 1rem; }
.epub-container {
  overflow-anchor: none;
}
.epub-container * {
  overflow-anchor: none;
}
</style>
