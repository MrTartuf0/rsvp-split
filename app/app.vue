<template>
  <div class="h-screen w-screen flex bg-black text-gray-200 font-sans selection:bg-[#E62828]/30 overflow-hidden">

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
        <PdfViewer />
        
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

        <!-- Parola RSVP -->
        <div class="flex w-full text-7xl md:text-8xl font-bold tracking-wide items-center font-[Inter,sans-serif]">
          <div v-if="!store.currentWord" class="w-full text-center text-[#222]">Pronto</div>
          <template v-else>
            <div class="flex-1 text-right text-gray-300">{{ wordParts.left }}</div>
            <div class="text-[#E62828] text-center flex-none">{{ wordParts.orp }}</div>
            <div class="flex-1 text-left text-gray-300">{{ wordParts.right }}</div>
          </template>
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
          <button @click="store.reset()" class="text-[#555] hover:text-white transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
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
          
          <!-- Pulsante Focus Mode -->
          <button 
            @click="isFocusMode = true" 
            class="transition flex flex-col items-center gap-1 text-[10px] font-bold tracking-wider text-[#555] hover:text-white"
          >
             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
             FOCUS
          </button>
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
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'
import { useRsvpEngine } from '~/composables/useRsvpEngine'
import { onKeyStroke } from '@vueuse/core'

const store = useRsvpStore()
useRsvpEngine()

// Stato per la Zen Mode e Focus Mode
const isZenMode = ref(false)
const isFocusMode = ref(false)

// Navigazione
const rewind = () => { store.currentIndex = Math.max(0, store.currentIndex - 10) }
const forward = () => { store.currentIndex = Math.min(store.words.length - 1, store.currentIndex + 10) }

// Tasti
onKeyStroke(' ', (e) => { e.preventDefault(); store.togglePlay() })
onKeyStroke('ArrowLeft', () => { rewind() })
onKeyStroke('ArrowRight', () => { forward() })
onKeyStroke('ArrowUp', () => { store.wpm = Math.min(1000, store.wpm + 25) })
onKeyStroke('ArrowDown', () => { store.wpm = Math.max(100, store.wpm - 25) })
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
