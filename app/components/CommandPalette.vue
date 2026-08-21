<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" @click.self="close">
    <div class="bg-bg-alt w-full max-w-2xl rounded-xl shadow-2xl border border-[#333] overflow-hidden flex flex-col" @click.stop>
      
      <!-- Input -->
      <div class="relative flex items-center px-4 border-b border-[#333]">
        <svg class="w-5 h-5 text-text-muted absolute left-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input 
          ref="searchInputRef"
          v-model="query"
          type="text"
          class="w-full bg-transparent border-none py-4 pl-10 pr-4 text-lg text-text-main focus:outline-none placeholder:text-text-muted font-sans"
          placeholder="Type a command, set WPM (e.g. '300'), or search recent files..."
          @keydown="handleKeydown"
        />
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold px-2 py-1 bg-[#222] text-text-muted rounded">ESC</span>
        </div>
      </div>

      <!-- Results List -->
      <div class="max-h-[50vh] overflow-y-auto custom-scrollbar">
        <ul class="py-2" v-if="filteredResults.length > 0">
          <li 
            v-for="(item, index) in filteredResults" 
            :key="item.id"
            class="px-4 py-3 flex items-center gap-4 cursor-pointer select-none transition-colors"
            :class="selectedIndex === index ? 'bg-accent/10 text-accent border-l-2 border-accent' : 'text-text-main hover:bg-[#222] border-l-2 border-transparent'"
            @click="selectItem(item)"
            @mouseenter="selectedIndex = index"
          >
            <span class="text-xl" v-if="item.icon" v-html="item.icon"></span>
            <div class="flex flex-col">
              <span class="font-bold text-sm">{{ item.title }}</span>
              <span v-if="item.subtitle" class="text-xs opacity-60 mt-0.5">{{ item.subtitle }}</span>
            </div>
            
            <div v-if="item.type === 'wpm'" class="ml-auto text-xs opacity-50 bg-[#222] px-2 py-1 rounded">
              Press Enter to apply
            </div>
          </li>
        </ul>
        <div v-else class="px-4 py-8 text-center text-text-muted text-sm">
          No results found.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { storage } from '~/utils/storage'

const props = defineProps({
  isOpen: Boolean,
  initialQuery: {
    type: String,
    default: ''
  }
})
const emit = defineEmits(['close', 'action'])

const query = ref('')
const searchInputRef = ref(null)
const selectedIndex = ref(0)
const recentFiles = ref([])

const loadRecentFiles = async () => {
  recentFiles.value = await storage.getAllFiles()
}

// Watch per l'apertura
watch(() => props.isOpen, async (newVal) => {
  if (newVal) {
    query.value = props.initialQuery
    selectedIndex.value = 0
    await loadRecentFiles()
    await nextTick()
    if (searchInputRef.value) searchInputRef.value.focus()
  }
})

// Costruiamo la lista di opzioni dinamiche
const allOptions = computed(() => {
  const options = []
  
  // 1. Comandi Base
  options.push({ id: 'cmd_focus', type: 'command', title: 'Toggle Focus Mode', icon: '🎯' })
  options.push({ id: 'cmd_zen', type: 'command', title: 'Toggle Zen Mode', icon: '🧘' })
  options.push({ id: 'cmd_search', type: 'command', title: 'Find word in text', subtitle: 'Search within the current reader', icon: '🔍' })
  options.push({ id: 'cmd_home', type: 'command', title: 'Go Home', subtitle: 'Return to start page', icon: '🏠' })
  
  // 2. File Recenti
  recentFiles.value.forEach(f => {
    options.push({
      id: `file_${f.id}`,
      type: 'file',
      title: f.name,
      subtitle: `Recent file • ${f.type.toUpperCase()}`,
      icon: '📄',
      fileRecord: f
    })
  })
  
  return options
})

// Filtriamo le opzioni in base alla query
const filteredResults = computed(() => {
  const q = query.value.trim().toLowerCase()
  
  // GOTO Page Mode
  if (q.startsWith(':')) {
    const pageStr = q.substring(1).trim()
    if (pageStr && !isNaN(pageStr)) {
      return [{
        id: 'cmd_goto',
        type: 'goto',
        title: `Go to page ${pageStr}`,
        icon: '📖',
        page: parseInt(pageStr, 10)
      }]
    }
    return []
  }

  // Command Mode
  if (q.startsWith('>')) {
    const searchCmd = q.substring(1).trim()
    const cmds = allOptions.value.filter(o => o.type === 'command')
    if (!searchCmd) return cmds
    return cmds.filter(opt => opt.title.toLowerCase().includes(searchCmd) || (opt.subtitle && opt.subtitle.toLowerCase().includes(searchCmd)))
  }

  // File Search Mode (f prefix)
  if (q.startsWith('f ')) {
    const searchFile = q.substring(2).trim()
    const files = allOptions.value.filter(o => o.type === 'file')
    if (!searchFile) return files
    return files.filter(opt => opt.title.toLowerCase().includes(searchFile) || (opt.subtitle && opt.subtitle.toLowerCase().includes(searchFile)))
  }

  // Se la query è un numero (senza prefissi), proponi di settare i WPM
  if (q && !isNaN(q)) {
    return [{
      id: 'cmd_wpm',
      type: 'wpm',
      title: `Set speed to ${q} WPM`,
      icon: '⚡',
      wpm: parseInt(q, 10)
    }]
  }
  
  // File Mode (default)
  const files = allOptions.value.filter(o => o.type === 'file')
  if (!q) return files
  return files.filter(opt => opt.title.toLowerCase().includes(q))
})

// Resetta la selezione quando cambia la query
watch(query, () => {
  selectedIndex.value = 0
})

const close = () => {
  emit('close')
}

const selectItem = (item) => {
  emit('action', item)
  close()
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
    return
  }
  
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < filteredResults.value.length - 1) {
      selectedIndex.value++
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    const selected = filteredResults.value[selectedIndex.value]
    if (selected) {
      selectItem(selected)
    }
  }
}
</script>
