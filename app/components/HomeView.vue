<template>
  <div class="min-h-screen flex flex-col bg-bg-base text-text-main p-8 lg:p-16 max-w-6xl mx-auto font-mono">
    
    <!-- Logo / Header -->
    <header class="flex items-center justify-between mb-16">
      <div class="flex items-center gap-3">
        <svg class="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
        <h1 class="text-2xl font-bold tracking-wider text-text-main">RSVP<span class="text-text-muted">reader</span></h1>
      </div>
    </header>

    <main class="flex-1 flex flex-col gap-12">
      
      <!-- Zona Paste Testo -->
      <section class="w-full">
        <div class="relative group">
          <textarea 
            v-model="pasteText" 
            placeholder="paste your text here, then press cmd+enter to read..." 
            class="w-full h-32 bg-transparent border-none focus:ring-0 resize-none text-xl lg:text-2xl text-text-muted placeholder:text-bg-alt focus:text-text-main transition-colors outline-none"
            @keydown.meta.enter.prevent="startTextRead"
            @keydown.ctrl.enter.prevent="startTextRead"
          ></textarea>
          <div class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
             <button @click="startTextRead" class="bg-bg-alt text-text-muted hover:text-accent px-4 py-2 rounded-md text-sm transition-colors">Read</button>
          </div>
        </div>
      </section>

      <!-- Zona File Upload (Drag & Drop) -->
      <section class="w-full">
        <label 
          class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-bg-alt hover:border-text-muted rounded-xl cursor-pointer transition-colors"
          @dragover.prevent
          @drop.prevent="onDrop"
        >
          <div class="flex flex-col items-center justify-center pt-5 pb-6 text-text-muted">
            <svg class="w-8 h-8 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            <p class="mb-2 text-sm"><span class="font-bold text-accent">Click to upload</span> or drag and drop</p>
            <p class="text-xs">PDF, EPUB, TXT, MD</p>
          </div>
          <input ref="fileInputRef" type="file" accept=".pdf,.epub,.txt,.md" class="hidden" @change="onFileSelect" />
        </label>
      </section>

      <!-- Recenti (Finder Style) -->
      <section v-if="recentFiles.length > 0" class="w-full mt-8">
        <h2 class="text-sm tracking-widest uppercase text-text-muted mb-6 flex items-center gap-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Recent files
        </h2>
        
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          <div 
            v-for="file in recentFiles" 
            :key="file.id"
            class="group flex flex-col gap-3 cursor-pointer"
            @click="openRecentFile(file)"
          >
            <!-- Copertina -->
            <div class="aspect-[1/1.4] rounded-lg bg-bg-alt overflow-hidden relative border border-transparent group-hover:border-accent transition-colors shadow-lg">
              <img v-if="file.coverUrl" :src="file.coverUrl" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
              <div v-else class="w-full h-full flex flex-col items-center justify-center text-text-muted group-hover:text-accent transition-colors">
                 <svg v-if="file.type === 'pdf'" class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                 <svg v-else-if="file.type === 'epub'" class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg>
                 <svg v-else class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
              </div>
              
              <!-- Tasto elimina -->
              <button @click.stop="deleteRecentFile(file.id)" class="absolute top-2 right-2 bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <!-- Info File -->
            <div class="flex flex-col">
              <span class="text-sm text-text-main truncate group-hover:text-accent transition-colors">{{ file.name }}</span>
              <span class="text-xs text-text-muted">{{ formatTimeAgo(file.lastOpened) }}</span>
            </div>
          </div>
        </div>
      </section>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { storage } from '~/utils/storage'

const emit = defineEmits(['openText', 'openFile', 'openRecent'])

const pasteText = ref('')
const recentFiles = ref([])
const fileInputRef = ref(null)

const handleKeyDown = (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'o') {
    e.preventDefault()
    if (fileInputRef.value) fileInputRef.value.click()
  }
}

const loadRecentFiles = async () => {
  recentFiles.value = await storage.getAllFiles()
}

onMounted(() => {
  loadRecentFiles()
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

const startTextRead = () => {
  if (pasteText.value.trim()) {
    emit('openText', pasteText.value)
    pasteText.value = ''
  }
}

const handleFile = async (file) => {
  if (!file) return
  
  const ext = file.name.split('.').pop().toLowerCase()
  let type = 'txt'
  if (ext === 'pdf') type = 'pdf'
  else if (ext === 'epub') type = 'epub'
  else if (ext === 'md') type = 'md'

  let coverUrl = null
  
  // Se è PDF, prova a generare una copertina in base64
  if (type === 'pdf') {
    try {
      const pdfjsLib = await import('pdfjs-dist')
      const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default
      
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const page = await pdf.getPage(1)
      const viewport = page.getViewport({ scale: 0.5 })
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height
      
      await page.render({ canvasContext: ctx, viewport }).promise
      coverUrl = canvas.toDataURL('image/jpeg', 0.8)
    } catch (e) {
      console.warn("Impossibile generare la copertina PDF", e)
    }
  }

  // Salva nel database locale (id è univoco)
  const fileId = `${Date.now()}-${file.name}`
  const fileRecord = {
    name: file.name,
    type,
    fileObj: file,
    coverUrl,
    lastOpened: Date.now()
  }
  
  await storage.saveFile(fileId, fileRecord)
  
  // Aggiorna lista e apri file
  await loadRecentFiles()
  emit('openFile', fileRecord)
}

const onFileSelect = (e) => {
  const file = e.target.files[0]
  if (file) handleFile(file)
}

const onDrop = (e) => {
  const file = e.dataTransfer.files[0]
  if (file) handleFile(file)
}

const openRecentFile = async (fileRecord) => {
  fileRecord.lastOpened = Date.now()
  await storage.saveFile(fileRecord.id, fileRecord)
  await loadRecentFiles()
  emit('openRecent', fileRecord)
}

const deleteRecentFile = async (id) => {
  await storage.deleteFile(id)
  await loadRecentFiles()
}

const formatTimeAgo = (timestamp) => {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
</script>
