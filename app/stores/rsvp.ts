import { defineStore } from 'pinia'

export const useRsvpStore = defineStore('rsvp', {
  state: () => ({
    words: [] as string[],
    currentIndex: 0,
    isPlaying: false,
    wpm: 300,
  }),
  actions: {
    loadText(text: string) {
      // Divide il testo per spazi e rimuove elementi vuoti
      this.words = text.trim().split(/\s+/).filter(w => w.length > 0)
      this.currentIndex = 0
    },
    togglePlay() {
      if (this.words.length === 0) return
      this.isPlaying = !this.isPlaying
    },
    reset() {
      this.isPlaying = false
      this.currentIndex = 0
    }
  },
  getters: {
    currentWord: (state) => state.words[state.currentIndex] || '',
    progress: (state) => {
      if (state.words.length === 0) return 0
      return (state.currentIndex / state.words.length) * 100
    }
  }
})
