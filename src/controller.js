import model from './model'
import views from './views'

class Controller {
  constructor() {
    // Model
    this.model = model
    // Views
    this.barchartAscending = views.barchart()
    this.barchartDescending = views.barchart()
    // Model functions binding
    this.model.bindEntriesListChanged(this.onEntriesListChanged.bind(this))
    // Views functions binding
    this.barchartAscending.bindClick((entry) => this.handleUpdateEntry({ id: entry.id, selected: !entry.selected })).bind(this)
    this.barchartDescending.bindClick((entry) => this.handleUpdateEntry({ id: entry.id, selected: !entry.selected })).bind(this)
  }
  //
  handleAddEntry(entry) {
    this.model.addEntry(entry)
  }
  handleUpdateEntry(entry) {
    this.model.updateEntry(entry)
  }
  handleDeleteEntry(entryId) {
    this.model.deleteEntry(entryId)
  }
  //
  onEntriesListChanged() {
    this.barchartAscending.data(this.model.entries)
    this.barchartDescending.data(this.model.entries.slice().reverse())
  }
}

export default new Controller()
