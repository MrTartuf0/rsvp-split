<template>
  <div class="h-full flex flex-col bg-bg-base relative">

    <!-- HEADER UNIVERSALE -->
    <div class="px-6 py-4 border-b border-bg-alt flex-shrink-0 z-20 bg-bg-base flex justify-between items-center gap-4">
      <div class="flex items-center gap-6">
        <button @click="$emit('goHome')" class="text-xs font-bold tracking-widest text-text-muted hover:text-text-main transition-colors uppercase flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
          Home
        </button>
        <h2 class="text-xs font-bold tracking-widest text-text-muted uppercase m-0">
          {{ viewMode === 'idle' ? '' : viewMode.toUpperCase() }}
        </h2>
        
        <!-- Controlli Zoom (Solo PDF) -->
        <div v-if="viewMode === 'pdf'" class="flex items-center bg-bg-alt rounded-md border border-bg-alt overflow-hidden">
          <button @click="changeZoom(-0.2)" :disabled="!currentPdf" class="px-3 py-1 text-text-muted hover:bg-[#222] hover:text-text-main transition-colors font-mono font-bold">-</button>
          <span class="px-3 py-1 text-xs text-text-main font-mono bg-[#1a1a1a]">{{ Math.round(zoomLevel * 100) }}%</span>
          <button @click="changeZoom(0.2)" :disabled="!currentPdf" class="px-3 py-1 text-text-muted hover:bg-[#222] hover:text-text-main transition-colors font-mono font-bold">+</button>
        </div>
      </div>

      <!-- Barra di Ricerca Custom RSVP (Visibile se file caricato) -->
      <div v-if="viewMode !== 'idle'" class="flex items-center flex-1 max-w-md bg-bg-alt rounded-lg overflow-hidden px-2 py-1">
        <svg class="w-4 h-4 text-text-muted ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input 
          ref="searchInputRef"
          type="text" 
          v-model="searchQuery" 
          @keyup.enter="nextSearchResult"
          placeholder="search and sync..." 
          class="bg-transparent border-none focus:outline-none text-sm text-text-main px-3 py-1 w-full font-mono placeholder:text-text-muted"
        />
        <div v-if="searchResults.length > 0" class="flex items-center gap-2">
          <span class="text-xs font-mono text-text-muted">{{ currentSearchIndex + 1 }} / {{ searchResults.length }}</span>
          <button @click="prevSearchResult" class="p-1 text-text-muted hover:text-text-main hover:bg-[#222] rounded"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"></path></svg></button>
          <button @click="nextSearchResult" class="p-1 text-text-muted hover:text-text-main hover:bg-[#222] rounded"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <span v-if="fileName" class="text-xs text-text-muted max-w-[150px] truncate">{{ fileName }}</span>
      </div>
    </div>

    <!-- AREA DI CONTENUTO PRINCIPALE -->
    <div class="flex-1 overflow-hidden relative flex flex-col items-center w-full bg-bg-base text-text-main">
      
      <!-- STATO: Testo Semplice o Markdown -->
      <div v-if="viewMode === 'text'" class="w-full h-full overflow-y-auto custom-scrollbar p-4 flex justify-center">
        <div class="w-full max-w-3xl mt-4 p-8 bg-bg-alt rounded-xl shadow-2xl text-text-main text-lg leading-relaxed font-mono whitespace-pre-wrap markdown-container" v-html="markdownHtml" @click="handleMarkdownClick" ref="markdownContainerRef">
        </div>
      </div>

      <!-- STATO: EPUB -->
      <div v-else-if="viewMode === 'epub'" class="w-full h-full relative bg-bg-base shadow-2xl overflow-hidden flex">
        
        <!-- SIDEBAR INDICE (a scomparsa) -->
        <div 
           class="absolute top-0 left-0 h-full bg-[#111] text-gray-300 w-80 z-40 transform transition-transform duration-300 shadow-2xl flex flex-col border-r border-[#222]"
           :class="showSidebar ? 'translate-x-0' : '-translate-x-full'"
        >
           <div class="p-6 border-b border-[#222] flex justify-between items-center bg-[#050505]">
              <h3 class="text-white font-bold tracking-wider uppercase text-sm">Table of Contents</h3>
              <button @click="showSidebar = false" class="text-gray-500 hover:text-[#E62828] font-bold text-xl leading-none">×</button>
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
              <div v-if="epubToc.length === 0" class="text-center text-gray-600 mt-10 text-sm">No table of contents found</div>
           </div>
        </div>

        <!-- AREA LETTURA -->
        <div class="flex-1 w-full h-full relative flex flex-col">
           
           <!-- PULSANTE SIDEBAR MINIMALE -->
           <div class="absolute top-10 left-6 z-30" v-if="!showSidebar">
              <button @click="showSidebar = !showSidebar" class="text-gray-500 hover:text-[#E62828] bg-[#111]/80 hover:bg-[#222] backdrop-blur-sm p-3 rounded-xl shadow-lg border border-[#222] transition-all">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              </button>
           </div>

           <div v-if="isLoading" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95">
             <div class="w-12 h-12 border-4 border-gray-200 border-t-[#E62828] rounded-full animate-spin mb-4"></div>
             <span class="text-[#E62828] text-sm font-mono uppercase tracking-widest animate-pulse">Extracting text...</span>
           </div>
           
           <div ref="epubContainerRef" class="epub-container w-full flex-1 p-4 pt-6 pb-10 overflow-hidden"></div>
        </div>
      </div>

      <!-- STATO: PDF -->
      <div v-else-if="viewMode === 'pdf'" class="w-full h-full relative bg-[#0a0a0a] overflow-hidden flex">
        
        <!-- SIDEBAR PAGINE (a scomparsa) -->
        <div 
           class="absolute top-0 left-0 h-full bg-[#111] text-gray-300 w-80 z-40 transform transition-transform duration-300 shadow-2xl flex flex-col border-r border-[#222]"
           :class="showSidebar ? 'translate-x-0' : '-translate-x-full'"
        >
           <div class="p-6 border-b border-[#222] flex justify-between items-center bg-[#050505]">
              <h3 class="text-white font-bold tracking-wider uppercase text-sm">Pages</h3>
              <button @click="showSidebar = false" class="text-gray-500 hover:text-[#E62828] font-bold text-xl leading-none">×</button>
           </div>
           <div class="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
              <button 
                v-for="(pageData, index) in pages" 
                :key="'nav-' + index" 
                @click="goToPdfPage(pageData.pageNumber)"
                class="group w-full text-left py-3 px-3 rounded-lg hover:bg-[#222] hover:text-white transition-all flex items-center gap-4 text-sm leading-tight border-l-2 border-transparent"
                :class="{ 'bg-[#E62828]/10 text-[#E62828] border-[#E62828] font-bold': currentPdfPage === pageData.pageNumber }"
              >
                <span class="w-8 text-center text-lg font-bold text-gray-500 shrink-0 group-hover:text-white transition-colors">{{ pageData.pageNumber }}</span>
                <div class="w-48 h-64 bg-white shrink-0 shadow-sm overflow-hidden flex items-center justify-center rounded">
                   <canvas :ref="el => setThumbRef(el, index)" class="w-full h-full object-contain"></canvas>
                </div>
              </button>
           </div>
        </div>

        <!-- AREA LETTURA PDF -->
        <div class="flex-1 w-full h-full relative flex flex-col">
           
           <!-- PULSANTE SIDEBAR MINIMALE PDF -->
           <div class="absolute top-10 left-6 z-50" v-if="!showSidebar">
              <button @click="showSidebar = !showSidebar" class="text-gray-400 hover:text-[#E62828] bg-[#111]/80 hover:bg-[#222] backdrop-blur-sm p-3 rounded-xl shadow-lg border border-[#222] transition-all">
                 <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              </button>
           </div>

           <div class="w-full h-full relative flex flex-col items-center overflow-y-auto custom-scrollbar p-4" id="pdf-scroll-container" @scroll="onPdfScroll">

           <div v-if="isLoading" class="text-[#E62828] text-sm animate-pulse mb-8 font-mono uppercase tracking-widest">Spatial Processing...</div>
           
           <div 
             v-for="(pageData, index) in pages" 
             :key="index" 
             :id="'pdf-page-' + pageData.pageNumber"
             class="relative mb-8 shadow-2xl bg-white flex-shrink-0" 
             :style="{ width: pageData.cssWidth + 'px', height: pageData.cssHeight + 'px' }"
           >
             <canvas :ref="el => setCanvasRef(el, index)" class="absolute top-0 left-0 z-0 w-full h-full"></canvas>
             <div class="absolute top-0 left-0 w-full h-full z-10">
                <div :id="'text-layer-' + pageData.pageNumber" class="textLayer"></div>
                <template v-if="pageData.rendered">
                  <div v-if="hasActiveWord(pageData)" id="active-pdf-word" class="absolute bg-[#E62828]/40 pointer-events-none rounded-[2px] z-10" :style="getActiveWordStyle(pageData)"></div>
                  <div v-for="(box, bIdx) in pageData.hitboxes" :key="bIdx" @click="onWordClick(box.index)" class="absolute cursor-pointer hover:bg-yellow-400/30 rounded-[2px] z-10" :style="{ left: box.left + 'px', top: box.top + 'px', width: box.width + 'px', height: box.height + 'px' }"></div>
                </template>
             </div>
           </div>
           </div>
        </div>
      </div>

      <!-- STATO: Vuoto -->
      <div v-else-if="viewMode === 'idle'" class="m-auto text-center text-gray-600 flex flex-col items-center gap-4">
        <svg class="w-16 h-16 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
        <p>Waiting for data...</p>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, markRaw, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'
import { marked } from 'marked'

const store = useRsvpStore()

const props = defineProps({
  fileToLoad: {
    type: Object,
    default: null
  },
  textToLoad: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['goHome'])

// Stati Globali
const viewMode = ref('idle') 
const isLoading = ref(false)
const fileName = ref('')

// Stati Ricerca Custom RSVP
const searchQuery = ref('')
const searchResults = ref([])
const currentSearchIndex = ref(0)
const searchInputRef = ref(null)

// Event listeners spostati in basso
watch(searchQuery, (newVal) => {
  if (!newVal || newVal.trim() === '') {
    searchResults.value = []
    currentSearchIndex.value = 0
    return
  }
  const q = newVal.toLowerCase()
  searchResults.value = store.words.reduce((acc, word, idx) => {
    if (word && word.toLowerCase().includes(q)) acc.push(idx)
    return acc
  }, [])
  currentSearchIndex.value = 0
  if (searchResults.value.length > 0 && !store.isPlaying) {
    store.currentIndex = searchResults.value[0]
  }
})

const nextSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value + 1) % searchResults.value.length
  store.currentIndex = searchResults.value[currentSearchIndex.value]
  if (store.isPlaying) store.isPlaying = false
}

const prevSearchResult = () => {
  if (searchResults.value.length === 0) return
  currentSearchIndex.value = (currentSearchIndex.value - 1 + searchResults.value.length) % searchResults.value.length
  store.currentIndex = searchResults.value[currentSearchIndex.value]
  if (store.isPlaying) store.isPlaying = false
}

const currentPdfPage = ref(1)
const showSidebar = ref(false)

// Stati PDF
const pages = ref([])
const canvasRefs = ref([])
const thumbRefs = ref([])
const currentPdf = ref(null)
const zoomLevel = ref(1.0)

// Stati Testo/Markdown
const markdownHtml = ref('')
const markdownContainerRef = ref(null)

// Stati EPUB
const epubContainerRef = ref(null)
const currentEpub = ref(null)
const epubRendition = ref(null)
const epubToc = ref([])
const currentChapterName = ref('')
const epubFontSize = ref(100)

const goToPdfPage = (pageNumber) => {
  const el = document.getElementById('pdf-page-' + pageNumber)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
    if (window.innerWidth < 768) showSidebar.value = false
    
    // Sincronizza RSVP alla prima parola della pagina
    const page = pages.value.find(p => p.pageNumber === pageNumber)
    if (page && page.hitboxes.length > 0) {
      store.currentIndex = page.hitboxes[0].index
    }
  }
}

let pdfScrollTimeout = null
const onPdfScroll = (e) => {
  if (pdfScrollTimeout) clearTimeout(pdfScrollTimeout)
  pdfScrollTimeout = setTimeout(() => {
    const container = e.target
    const scrollCenter = container.scrollTop + container.clientHeight / 2
    
    let closestPage = 1
    let minDiff = Infinity
    
    for (const page of pages.value) {
      const el = document.getElementById('pdf-page-' + page.pageNumber)
      if (el) {
        const offsetTop = el.offsetTop - container.offsetTop
        const center = offsetTop + el.clientHeight / 2
        const diff = Math.abs(center - scrollCenter)
        if (diff < minDiff) {
          minDiff = diff
          closestPage = page.pageNumber
        }
      }
    }
    
    currentPdfPage.value = closestPage
  }, 100)
}
const readingProgress = ref(0)
const showEpubSidebar = ref(false)

const setCanvasRef = (el, index) => { if (el) canvasRefs.value[index] = el }
const setThumbRef = (el, index) => { if (el) thumbRefs.value[index] = el }

const renderThumbnails = () => {
  if (viewMode.value !== 'pdf') return
  for (let i = 0; i < pages.value.length; i++) {
    const thumbCanvas = thumbRefs.value[i]
    const mainCanvas = canvasRefs.value[i]
    if (thumbCanvas && mainCanvas && pages.value[i].rendered) {
      const aspectRatio = mainCanvas.width / mainCanvas.height
      thumbCanvas.width = 200
      thumbCanvas.height = thumbCanvas.width / aspectRatio
      const ctx = thumbCanvas.getContext('2d')
      ctx.drawImage(mainCanvas, 0, 0, thumbCanvas.width, thumbCanvas.height)
    }
  }
}

watch(showSidebar, (newVal) => {
  if (newVal && viewMode.value === 'pdf') {
    nextTick(() => {
      renderThumbnails()
    })
  }
})

const onWordClick = (globalIndex) => {
  store.currentIndex = globalIndex
  if (store.isPlaying) store.isPlaying = false
  
  // Togli il focus dall'iframe o dall'elemento cliccato per ripristinare le shortcut globali
  if (document.activeElement) {
    document.activeElement.blur()
  }
  window.focus()
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

const elaboraFile = async (file) => {
  fileName.value = file.name

  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
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

onMounted(async () => {
  await nextTick()
  if (props.fileToLoad) {
    elaboraFile(props.fileToLoad)
  } else if (props.textToLoad) {
    processRawText(props.textToLoad)
  }
})

watch(() => props.fileToLoad, async (newVal) => {
  if (newVal) {
    await nextTick()
    elaboraFile(newVal)
  }
})

watch(() => props.textToLoad, async (newVal) => {
  if (newVal) {
    await nextTick()
    processRawText(newVal)
  }
})

// Sincronizza stato PDF nello store
watch([currentPdfPage, () => pages.value.length], ([page, total]) => {
  if (viewMode.value === 'pdf') {
    store.currentPage = page
    store.totalPages = total
  }
})

// Sincronizza stato EPUB nello store
watch([currentChapterName, () => epubToc.value.length], ([name, total]) => {
  if (viewMode.value === 'epub') {
    store.currentChapterName = name
    store.totalPages = total
  }
})

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
      oldSpan.removeAttribute("id")
    }
  }
  
  const newSpan = container.querySelector(`span[data-index="${newIdx}"]`)
  if (newSpan) {
    newSpan.className = "cursor-pointer transition-colors rounded-sm bg-[#E62828]/40 px-1"
    newSpan.id = "active-text-word"
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
        
        // Auto-Scroll Intelligente per EPUB
        if (targetContents) {
          const spanRect = newSpan.getBoundingClientRect()
          let absoluteTop = spanRect.top
          
          const iframe = targetContents.window ? targetContents.window.frameElement : null
          if (iframe) {
            absoluteTop += iframe.getBoundingClientRect().top
          }
          
          const viewportHeight = window.innerHeight
          // Se la parola sta per uscire dalla vista (top 20% o bottom 20%), centra
          if (absoluteTop < viewportHeight * 0.2 || absoluteTop > viewportHeight * 0.8) {
             newSpan.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
    }
  }
  
  // Auto-Scroll per PDF e Testo
  if (viewMode.value === 'pdf' || viewMode.value === 'text') {
    nextTick(() => {
      let activeEl = null
      if (viewMode.value === 'pdf') activeEl = document.getElementById('active-pdf-word')
      else if (viewMode.value === 'text') activeEl = document.getElementById('active-text-word')
      
      if (activeEl) {
        const rect = activeEl.getBoundingClientRect()
        if (rect.top < window.innerHeight * 0.2 || rect.top > window.innerHeight * 0.8) {
          activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    })
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
        hitboxes: pageHitboxes, viewport, textContent: markRaw(textContent), pageObject: markRaw(page), rendered: false
      })
    }
    if (reloadText) {
      store.loadText(globalWordArray.join(' '))
    }
    currentPdfPage.value = 1
    setTimeout(() => renderPages(), 150)
  } finally { isLoading.value = false }
}

const renderPages = async () => {
  await nextTick()
  let pdfjsLib
  try { pdfjsLib = await import('pdfjs-dist') } catch {}

  for (let i = 0; i < pages.value.length; i++) {
    const p = pages.value[i]
    if (!canvasRefs.value[i]) continue
    canvasRefs.value[i].width = p.physicalWidth
    canvasRefs.value[i].height = p.physicalHeight
    try { 
      await p.pageObject.render({ canvasContext: canvasRefs.value[i].getContext('2d'), transform: p.transform, viewport: p.viewport }).promise; 
      p.rendered = true 
      
      // Update thumbnail if sidebar is open
      if (showSidebar.value) {
         const thumbCanvas = thumbRefs.value[i]
         if (thumbCanvas) {
            const aspectRatio = canvasRefs.value[i].width / canvasRefs.value[i].height
            thumbCanvas.width = 200
            thumbCanvas.height = 200 / aspectRatio
            thumbCanvas.getContext('2d').drawImage(canvasRefs.value[i], 0, 0, thumbCanvas.width, thumbCanvas.height)
         }
      }
      
      const textLayerDiv = document.getElementById('text-layer-' + p.pageNumber)
      if (textLayerDiv && p.textContent && pdfjsLib && pdfjsLib.renderTextLayer) {
        textLayerDiv.innerHTML = '' // Clear if re-rendering
        pdfjsLib.renderTextLayer({
          textContentSource: p.textContent,
          container: textLayerDiv,
          viewport: p.viewport,
          textDivs: []
        })
      }
    } catch {}
  }
}

const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      document.activeElement.blur()
      return
    }
  }

  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    if (searchInputRef.value) searchInputRef.value.focus()
    return
  }

  // Ignora le shortcut Vim se stiamo scrivendo nella search bar o nell'area paste
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return
  if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return // Solo tasti lisci
  
  const scrollAmount = 150
  
  let container = null
  if (viewMode.value === 'pdf') container = document.getElementById('pdf-scroll-container')
  else if (viewMode.value === 'text') container = markdownContainerRef.value?.parentElement
  else if (viewMode.value === 'epub') container = epubContainerRef.value

  if (!container) return

  if (e.key === 'j') {
    jumpLine(1)
  } else if (e.key === 'k') {
    jumpLine(-1)
  } else if (e.key === '-' || e.key === '_') {
    if (viewMode.value === 'pdf') changeZoom(-0.1)
    else if (viewMode.value === 'epub') {
       epubFontSize.value = Math.max(50, epubFontSize.value - 10)
       if (epubRendition.value) epubRendition.value.themes.fontSize(epubFontSize.value + '%')
    }
  } else if (e.key === '=' || e.key === '+') {
    if (viewMode.value === 'pdf') changeZoom(0.1)
    else if (viewMode.value === 'epub') {
       epubFontSize.value = Math.min(300, epubFontSize.value + 10)
       if (epubRendition.value) epubRendition.value.themes.fontSize(epubFontSize.value + '%')
    }
  } else if (e.key === 'u' && viewMode.value === 'pdf') {
    const prevPage = Math.max(1, currentPdfPage.value - 1)
    goToPdfPage(prevPage)
  } else if (e.key === 'd' && viewMode.value === 'pdf') {
    const nextPage = Math.min(pages.value.length, currentPdfPage.value + 1)
    goToPdfPage(nextPage)
  } else if (e.key === 'u' && viewMode.value === 'epub') {
    if (epubRendition.value) epubRendition.value.prev()
  } else if (e.key === 'd' && viewMode.value === 'epub') {
    if (epubRendition.value) epubRendition.value.next()
  } else if (e.key === 'n' && viewMode.value === 'epub') {
    showEpubSidebar.value = !showEpubSidebar.value
  }
}

const jumpLine = (direction) => {
  if (store.isPlaying) store.isPlaying = false

  if (viewMode.value === 'pdf' && pages.value.length > 0) {
    let currentBox = null
    let pageIndex = -1
    for (let i = 0; i < pages.value.length; i++) {
      const p = pages.value[i]
      if (!p.hitboxes) continue
      const b = p.hitboxes.find(h => h.index === store.currentIndex)
      if (b) {
        currentBox = b
        pageIndex = i
        break
      }
    }
    
    if (currentBox) {
      if (direction === 1) {
        for (let i = pageIndex; i < pages.value.length; i++) {
          const p = pages.value[i]
          for (const b of p.hitboxes) {
             if (b.index <= currentBox.index) continue
             if (i > pageIndex || b.top > currentBox.top + 5) {
                store.currentIndex = b.index
                return
             }
          }
        }
      } else {
        for (let i = pageIndex; i >= 0; i--) {
          const p = pages.value[i]
          if (!p.hitboxes) continue
          for (let j = p.hitboxes.length - 1; j >= 0; j--) {
             const b = p.hitboxes[j]
             if (b.index >= currentBox.index) continue
             if (i < pageIndex || b.top < currentBox.top - 5) {
                const targetTop = b.top
                let firstWordOfLine = b
                for (let k = j; k >= 0; k--) {
                   if (Math.abs(p.hitboxes[k].top - targetTop) < 5) {
                      firstWordOfLine = p.hitboxes[k]
                   } else break
                }
                store.currentIndex = firstWordOfLine.index
                return
             }
          }
        }
      }
    }
  }
  
  // Fallback (Text/EPUB)
  store.currentIndex = Math.max(0, Math.min(store.words.length - 1, store.currentIndex + (direction * 12)))

}

const handleGotoPage = (e) => {
  const pageNum = e.detail
  if (viewMode.value === 'pdf') {
    goToPdfPage(pageNum)
  } else if (viewMode.value === 'epub') {
    // Basic fallback for epub (usually relies on cfi, but we try percentage or spine index if possible)
    // Note: pageNum for epub without a generated page list is inaccurate, 
    // but we can try jumping by index if we had one. For now just ignore or try spine.
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('rsvp-goto-page', handleGotoPage)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('rsvp-goto-page', handleGotoPage)
})
</script>

<style>
/* PDF TextLayer - per Cmd+F e selezione testo nativa */
.textLayer {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  line-height: 1.0;
  z-index: 5;
}
.textLayer > span {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
}
.textLayer ::selection {
  background: rgba(0, 0, 255, 0.2);
}

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
