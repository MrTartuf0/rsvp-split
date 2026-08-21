<template>
  <div class="h-screen w-screen bg-bg-base text-text-main font-mono overflow-hidden">
    <HomeView 
      v-if="isHome" 
      @openFile="handleOpenFile" 
      @openText="handleOpenText" 
      @openRecent="handleOpenFile" 
    />
    
    <div v-else class="h-full w-full flex selection:bg-[#E62828]/30">

    <!-- SINISTRA: Viewers -->
    <div 
      class="h-full bg-white relative transition-all duration-500 overflow-hidden flex-shrink-0 flex flex-col"
      :class="isZenMode ? 'w-0 opacity-0 border-none' : (isFocusMode ? 'w-full' : 'w-1/2 border-r')"
    >
      <!-- Pulsante Esci da Focus (visibile solo in Focus Mode) -->
      <button 
        v-if="isFocusMode" 
        @click="isFocusMode = false"
        class="absolute bottom-8 right-8 z-50 bg-[#E62828] text-white shadow-xl px-4 py-2 rounded-full flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-transform hover:scale-105"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Esci da Focus
      </button>

      <!-- Pannellino Play/Pause per Focus Mode -->
      <div v-if="isFocusMode" class="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 bg-[#111] text-white shadow-2xl px-6 py-3 rounded-full flex items-center gap-6">
         <button @click="rewind" class="text-gray-400 hover:text-white"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 18l-8-6 8-6v12zm-10 0l-8-6 8-6v12z"/></svg></button>
         <button @click="store.togglePlay()" class="text-white hover:text-[#E62828] transform hover:scale-110 transition-all">
            <svg v-if="!store.isPlaying" class="w-6 h-6 pl-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg v-else class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
         </button>
         <button @click="forward" class="text-gray-400 hover:text-white"><svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6l8 6-8 6V6zm10 0l8 6-8 6V6z"/></svg></button>
         <div class="h-4 w-[1px] bg-gray-700"></div>
         <span class="text-xs font-mono font-bold text-gray-400">{{ store.wpm }} WPM</span>
      </div>

      <!-- FIX HYDRATION: Diciamo a Nuxt di renderizzarlo solo lato client -->
      <ClientOnly>
        <PdfViewer 
          :file-to-load="selectedFile" 
          :text-to-load="selectedText" 
          @go-home="handleGoHome" 
        />
        
        <!-- Opzionale: un piccolo feedback mentre carica -->
        <template #fallback>
          <div class="p-8 text-gray-500 text-sm animate-pulse flex h-full items-center justify-center">
            Inizializzazione ambiente di lettura...
          </div>
        </template>
      </ClientOnly>
    </div>

    <!-- DESTRA: Lettore RSVP -->
    <div 
      class="h-full flex flex-col justify-center relative bg-[#0a0a0a] transition-all duration-500"
      :class="isZenMode ? 'w-full' : (isFocusMode ? 'w-0 opacity-0 overflow-hidden pointer-events-none' : 'w-1/2')"
    >
      
      <!-- Pulsante Esci da Zen (visibile solo in Zen) -->
      <button 
        v-if="isZenMode" 
        @click="isZenMode = false"
        class="absolute top-8 left-8 text-gray-500 hover:text-white flex items-center gap-2 text-xs font-bold tracking-widest uppercase transition-colors"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        Esci da Zen
      </button>

      <!-- Riquadro Lettura Centrale -->
      <div class="w-full relative py-24 flex flex-col items-center">
        <!-- Linee guida (scompaiono in Zen Mode quando in riproduzione) -->
        <div class="absolute top-0 w-3/4 border-t border-[#222] transition-opacity" :class="{ 'opacity-0': isZenMode && store.isPlaying }"></div>
        <div class="absolute top-0 w-[1px] h-6 bg-[#444] transition-opacity" :class="{ 'opacity-0': isZenMode && store.isPlaying }"></div>
        
        <div class="absolute bottom-0 w-3/4 border-b border-[#222] transition-opacity" :class="{ 'opacity-0': isZenMode && store.isPlaying }"></div>
        <div class="absolute bottom-0 w-[1px] h-6 bg-[#444] transition-opacity" :class="{ 'opacity-0': isZenMode && store.isPlaying }"></div>

        <!-- Parola RSVP con Contesto -->
        <div class="flex w-full items-center justify-center">
          
          <!-- Main Word Container -->
          <div 
            class="flex w-full sm:w-[80%] lg:w-[70%] font-bold tracking-wide items-center font-[Inter,sans-serif] z-10 relative whitespace-nowrap transition-all duration-300"
            :class="isZenMode ? 'text-6xl md:text-8xl' : 'text-4xl md:text-6xl'"
          >
            
            <!-- Parola Precedente -->
            <div class="absolute right-[100%] pr-6 text-2xl md:text-4xl text-gray-500/30 font-normal truncate w-[150px] md:w-[250px] text-right transition-opacity duration-300 pointer-events-none hidden sm:block" :class="{ 'opacity-0': !isZenMode }">
               {{ prevWord }}
            </div>

            <div v-if="!store.currentWord" class="w-full text-center text-[#222]">Pronto</div>
            <template v-else>
              <div class="flex-1 text-right text-gray-300">{{ wordParts.left }}</div>
              <div class="text-[#E62828] text-center flex-none">{{ wordParts.orp }}</div>
              <div class="flex-1 text-left text-gray-300">{{ wordParts.right }}</div>
            </template>

            <!-- Parola Successiva -->
            <div class="absolute left-[100%] pl-6 text-2xl md:text-4xl text-gray-500/30 font-normal truncate w-[150px] md:w-[250px] text-left transition-opacity duration-300 pointer-events-none hidden sm:block" :class="{ 'opacity-0': !isZenMode }">
               {{ nextWord }}
            </div>

          </div>
        </div>
      </div>

      <!-- Controlli (Scompaiono in Zen Mode se in riproduzione) -->
      <div 
        class="absolute bottom-12 w-full flex flex-col items-center gap-8 px-16 transition-opacity duration-500"
        :class="{ 'opacity-0 pointer-events-none': isZenMode && store.isPlaying }"
      >
        
        <div class="absolute top-[-40px] left-0 w-full h-[2px] bg-transparent">
           <div class="h-full bg-[#E62828] transition-all duration-150" :style="{ width: store.progress + '%' }"></div>
        </div>

        <!-- Pulsantiera -->
        <div class="flex items-center gap-10">
          <!-- Pulsante Focus Mode (Spostato a sinistra) -->
          <button 
            @click="isFocusMode = true" 
            class="transition flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider text-[#555] hover:text-white"
          >
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
             FOCUS
          </button>
          
          <button @click="rewind" class="text-[#555] hover:text-white transition">
            <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18 18l-8-6 8-6v12zm-10 0l-8-6 8-6v12z"/></svg>
          </button>
          
          <!-- Pulsante Play/Pausa Corretto Otticamente -->
          <button @click="store.togglePlay()" class="w-[72px] h-[72px] bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform">
            <!-- Padding sinistro (pl-1) aggiunto per centrare visivamente il triangolo -->
            <svg v-if="!store.isPlaying" class="w-8 h-8 pl-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            <svg v-else class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          </button>
          
          <button @click="forward" class="text-[#555] hover:text-white transition">
             <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6l8 6-8 6V6zm10 0l8 6-8 6V6z"/></svg>
          </button>
          
          <!-- Pulsante Zen Mode -->
          <button 
            @click="isZenMode = !isZenMode" 
            class="transition flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider"
            :class="isZenMode ? 'text-white' : 'text-[#555] hover:text-white'"
          >
             <svg v-if="!isZenMode" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
             <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 14h4v4M4 10h4V6m12 8h-4v4m4-8h-4V6M10 10l-6-6m10 10l6 6m0-16l-6 6m-4 4l-6 6"></path></svg>
             ZEN
          </button>
        </div>

        <!-- Statistiche di Lettura -->
        <div v-if="store.words.length > 0" class="flex flex-wrap items-center justify-center gap-6 text-[10px] font-bold text-[#555] tracking-[0.1em] uppercase mt-2 mb-2 w-full px-4 text-center">
          <span>Words: <span class="text-white">{{ store.currentIndex + 1 }}</span> / {{ store.words.length }}</span>
          <span v-if="store.totalPages > 0">
             <span v-if="store.currentChapterName" class="text-white">Ch: {{ store.currentChapterName }}</span>
             <span v-else>Page: <span class="text-white">{{ store.currentPage }}</span> / {{ store.totalPages }}</span>
          </span>
          <span>Time left: <span class="text-white">{{ timeRemainingStr }}</span></span>
        </div>

        <!-- Slider Velocità -->
        <div class="w-full max-w-md">
          <div class="flex justify-between items-end mb-2">
            <span class="text-[10px] font-bold text-[#555] tracking-[0.2em] uppercase">Reading Speed</span>
            <span class="text-[#E62828] font-bold text-sm tracking-wider">{{ store.wpm }} WPM</span>
          </div>
          <input type="range" min="100" max="1000" step="25" v-model="store.wpm" 
            class="w-full h-1 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#E62828]" />
        </div>
      </div>
    </div>
    </div>
    
    <CommandPalette 
      :is-open="isPaletteOpen" 
      :initial-query="paletteInitialQuery"
      @close="isPaletteOpen = false" 
      @action="handlePaletteAction" 
    />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'
import { useRsvpEngine } from '~/composables/useRsvpEngine'
import { onKeyStroke } from '@vueuse/core'
import HomeView from '~/components/HomeView.vue'

const store = useRsvpStore()
useRsvpEngine()

// Stato Routing Semplice
const isHome = ref(true)
const selectedFile = ref(null)
const selectedText = ref(null)

const handleOpenFile = (fileRecord) => {
  selectedFile.value = fileRecord.fileObj
  selectedText.value = null
  isHome.value = false
}

const handleOpenText = (text) => {
  selectedText.value = text
  selectedFile.value = null
  isHome.value = false
}

const handleGoHome = () => {
  isHome.value = true
  selectedFile.value = null
  selectedText.value = null
  store.reset()
  store.words = []
  store.currentIndex = 0
}

// Statistiche
const timeRemainingStr = computed(() => {
  if (store.words.length === 0 || store.wpm === 0) return '0m'
  const remainingWords = store.words.length - store.currentIndex
  const minutes = Math.floor(remainingWords / store.wpm)
  const seconds = Math.floor((remainingWords % store.wpm) / (store.wpm / 60))
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
})

// Stato per la Zen Mode, Focus Mode e Palette
const isZenMode = ref(false)
const isFocusMode = ref(false)
const isPaletteOpen = ref(false)
const paletteInitialQuery = ref('')

const openPalette = (initialQuery = '') => {
  paletteInitialQuery.value = initialQuery
  isPaletteOpen.value = true
}

const handlePaletteAction = (action) => {
  if (action.type === 'wpm') {
    store.wpm = action.wpm
  } else if (action.type === 'file') {
    handleOpenFile(action.fileRecord)
  } else if (action.type === 'goto') {
    window.dispatchEvent(new CustomEvent('rsvp-goto-page', { detail: action.page }))
  } else if (action.type === 'command') {
    if (action.id === 'cmd_focus') isFocusMode.value = !isFocusMode.value
    if (action.id === 'cmd_zen') isZenMode.value = !isZenMode.value
    if (action.id === 'cmd_home') handleGoHome()
    if (action.id === 'cmd_search') {
       if (!isHome.value) {
          // Triggera il Cmd+F gestito nativamente dal PdfViewer
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', metaKey: true }))
       }
    }
  }
}

// Global Shortcuts
if (import.meta.client) {
  window.addEventListener('keydown', (e) => {
    const isMac = navigator.userAgent.includes('Mac')
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey

    if (cmdOrCtrl) {
      const key = e.key.toLowerCase()
      if (key === 'p') {
        e.preventDefault()
        if (e.shiftKey) {
          openPalette('>') // VSCode style: search commands
        } else {
          openPalette('')  // VSCode style: search files
        }
      } else if (key === 'o') {
        e.preventDefault()
        if (e.shiftKey) {
          openPalette('') // Search loaded files
        } else {
          // New file picker
          if (!isHome.value) {
            handleGoHome()
            setTimeout(() => {
              const fileInput = document.querySelector('input[type="file"]')
              if (fileInput) fileInput.click()
            }, 100)
          } else {
            const fileInput = document.querySelector('input[type="file"]')
            if (fileInput) fileInput.click()
          }
        }
      }
    }
  })
}

// Navigazione
const rewindWords = (count) => { store.currentIndex = Math.max(0, store.currentIndex - count) }
const forwardWords = (count) => { store.currentIndex = Math.min(store.words.length - 1, store.currentIndex + count) }

const ignoreIfInput = (e) => {
  if (isPaletteOpen.value) return true
  return ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
}

// Tasti
onKeyStroke(' ', (e) => { if (ignoreIfInput(e)) return; e.preventDefault(); store.togglePlay() })
onKeyStroke('ArrowLeft', (e) => { if (ignoreIfInput(e)) return; rewindWords(1) })
onKeyStroke('ArrowRight', (e) => { if (ignoreIfInput(e)) return; forwardWords(1) })
onKeyStroke('h', (e) => { if (ignoreIfInput(e)) return; rewindWords(1) })
onKeyStroke('l', (e) => { if (ignoreIfInput(e)) return; forwardWords(1) })
onKeyStroke('H', (e) => { if (ignoreIfInput(e)) return; rewindWords(10) })
onKeyStroke('L', (e) => { if (ignoreIfInput(e)) return; forwardWords(10) })
onKeyStroke('ArrowUp', (e) => { if (ignoreIfInput(e)) return; store.wpm = Math.min(1000, store.wpm + 25) })
onKeyStroke('ArrowDown', (e) => { if (ignoreIfInput(e)) return; store.wpm = Math.max(100, store.wpm - 25) })
onKeyStroke('K', (e) => { if (ignoreIfInput(e)) return; store.wpm = Math.min(1000, store.wpm + 25) })
onKeyStroke('J', (e) => { if (ignoreIfInput(e)) return; store.wpm = Math.max(100, store.wpm - 25) })
onKeyStroke('z', (e) => { if (ignoreIfInput(e)) return; isZenMode.value = !isZenMode.value })
onKeyStroke('f', (e) => { if (ignoreIfInput(e)) return; openPalette('f ') })
onKeyStroke('q', (e) => { if (ignoreIfInput(e) || isHome.value) return; handleGoHome() })
onKeyStroke('Escape', () => { isZenMode.value = false; isFocusMode.value = false }) // Esce dallo Zen/Focus con Esc

// Calcolo ORP
const wordParts = computed(() => {
  const word = store.currentWord
  if (!word) return { left: '', orp: '', right: '' }

  const len = word.length
  let orpIndex = 0

  if (len === 1) orpIndex = 0
  else if (len >= 2 && len <= 4) orpIndex = 1
  else if (len >= 5 && len <= 6) orpIndex = 2
  else if (len >= 7 && len <= 8) orpIndex = 3
  else if (len >= 9 && len <= 10) orpIndex = 4
  else if (len >= 11 && len <= 12) orpIndex = 5
  else orpIndex = Math.floor(len / 2) - 1

  return {
    left: word.substring(0, orpIndex),
    orp: word.charAt(orpIndex),
    right: word.substring(orpIndex + 1)
  }
})

// Contesto (parola precedente e successiva)
const prevWord = computed(() => {
  if (store.currentIndex > 0 && store.words.length > 0) {
    return store.words[store.currentIndex - 1]
  }
  return ''
})

const nextWord = computed(() => {
  if (store.currentIndex < store.words.length - 1 && store.words.length > 0) {
    return store.words[store.currentIndex + 1]
  }
  return ''
})
</script>

<style>
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #E62828;
  cursor: pointer;
  margin-top: -6px;
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: #222;
  border-radius: 2px;
}
</style>
