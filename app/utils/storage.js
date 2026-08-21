import localforage from 'localforage'

// Inizializza il database per i file recenti
const store = localforage.createInstance({
  name: 'RSVP_Reader',
  storeName: 'recentFiles'
})

export const storage = {
  async saveFile(fileId, fileData) {
    try {
      await store.setItem(fileId, fileData)
    } catch (err) {
      console.error('Errore nel salvataggio del file:', err)
    }
  },

  async getFile(fileId) {
    try {
      return await store.getItem(fileId)
    } catch (err) {
      console.error('Errore nel recupero del file:', err)
      return null
    }
  },

  async deleteFile(fileId) {
    try {
      await store.removeItem(fileId)
    } catch (err) {
      console.error('Errore nella cancellazione del file:', err)
    }
  },

  async getAllFiles() {
    try {
      const files = []
      await store.iterate((value, key) => {
        files.push({ id: key, ...value })
      })
      // Ordina per ultimo aperto (timestamp decrescente)
      return files.sort((a, b) => b.lastOpened - a.lastOpened)
    } catch (err) {
      console.error('Errore nel recupero di tutti i file:', err)
      return []
    }
  }
}
