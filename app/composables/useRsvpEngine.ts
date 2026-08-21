import { watch } from 'vue'
import { useRsvpStore } from '~/stores/rsvp'

export function useRsvpEngine() {
  const store = useRsvpStore()
  let timer: ReturnType<typeof setTimeout> | null = null

  const calculateDelay = (word: string, baseWpm: number) => {
    const baseDelay = 60000 / baseWpm
    let delay = baseDelay

    // 1. Ritardo per la punteggiatura
    if (word.match(/[\.\!\?]$/)) {
      delay += baseDelay * 1.5 // +150% di pausa a fine frase
    } else if (word.match(/[\,\;\:\-]$/)) {
      delay += baseDelay * 0.8 // +80% per pause brevi
    }

    // 2. Ritardo per le parole lunghe (proporzionale)
    const pureWord = word.replace(/[\.\!\?\,\;\:\-]/g, '') // rimuove la punteggiatura per contare le lettere
    if (pureWord.length > 8) {
      // Aggiunge il 15% di tempo extra per ogni lettera oltre l'ottava
      const extraLength = pureWord.length - 8
      delay += baseDelay * (extraLength * 0.15)
    }

    return delay
  }

  const playNext = () => {
    if (!store.isPlaying || store.currentIndex >= store.words.length - 1) {
      store.isPlaying = false
      return
    }

    const delay = calculateDelay(store.words[store.currentIndex], store.wpm)

    timer = setTimeout(() => {
      store.currentIndex++
      playNext()
    }, delay)
  }

  watch(() => store.isPlaying, (playing) => {
    if (playing) {
      playNext()
    } else if (timer) {
      clearTimeout(timer)
    }
  })

  return { calculateDelay }
}
