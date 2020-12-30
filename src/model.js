class Model {
  constructor() {
    this.entries = []
    this.entriesById = {}
    this.onEntriesListChanged = () => {}
  }
  // 
  bindEntriesListChanged(callback) {
    this.onEntriesListChanged = callback
  }
  // 
  addEntry(entry) {
    if (entry.id === undefined) throw new Error('Entry with missing id')
    this.entries.push(entry)
    this.entriesById[entry.id] = this.entries.length - 1
    this.onEntriesListChanged()
  }
  updateEntry(entry) {
    this.entries[this.entriesById[entry.id]] = { ...this.entriesById[entry.id], ...entry }
    this.onEntriesListChanged()
  }
  deleteEntry(entryId) {
    const entryIndex = this.entriesById[entryId]
    this.entries.splice(entryIndex, 1)
    delete this.entriesById[entryId]
    this.entries.forEach(e => {
      if (this.entriesById[e.id] > entryIndex) this.entriesById[e.id] -= 1
    })
    this.onEntriesListChanged()
  }
}

export default new Model()
