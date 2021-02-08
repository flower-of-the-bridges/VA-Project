import model from './model'
import views from './views'

class Controller {
  constructor() {
    // Model
    this.model = model
    // Views
    this.barchartAscending = views.barchart();
    this.barchartDescending = views.barchart();
    this.scatter = views.scatter();
    this.time = views.time();
    this.boxplot = views.boxplot();
    this.mapView = views.mapView();
    // Model functions binding
    this.model.bindEntriesListChanged(this.onEntriesListChanged.bind(this))
    // Views functions binding
    this.boxplot.bindBrush((brushMode, d, brush, views, field) => this.onBrushChanged(brushMode, d, brush, views, field)).bind(this);
    this.boxplot.bindBrushComplete((views) => this.onBrushCompleted(views)).bind(this);
    this.time.bindBrush((brushMode, d, brush, views, field) => this.onBrushChanged(brushMode, d, brush, views, field)).bind(this);
    this.time.bindBrushComplete((views, restCall) => this.onBrushCompleted(views, restCall)).bind(this);
    this.mapView.bindCallback(() => {
      this.timeBrush = false;
      this.boxBrush = false;
      brushMobilityButton.disabled = true;
      this.onMapUpdated();
      this.computeAggregate();
    }).bind(this);
    // brush
    this.timeBrush = false;
    this.boxBrush = false;
  }
  //
  handleAddEntry(entry) {
    this.model.addEntry(entry)
  }

  /** 
   * calls model to add covid data 
   */
  addCovidData(entry, index) {
    this.model.addRecord(entry, true, index)
  }

  /** 
   * calls model to add mobility data 
   */
  addMobilityData(entry) {
    if (entry.sub_region_1 != "" && entry.sub_region_2 == "") {
      // add only if its related to only the region in general
      this.model.addRecord(entry, false)
    }
  }

  saveDataset() {
    let header = Object.keys(this.model.entries[0])
    let csv = [
      header.join(','), // header row first
      ...this.model.entries.map(row => header.map(fieldName => row[fieldName]).join(','))
    ].join('\r\n')

    let uriContent = "data:text/csv," + encodeURIComponent(csv);
    window.open(uriContent, '');
  }

  handleUpdateEntry(entry, preventDefault) {
    this.model.updateEntry(entry, preventDefault)
  }
  handleDeleteEntry(entryId) {
    this.model.deleteEntry(entryId)
  }
  //
  onEntriesListChanged(views) {
    if (views && Array.isArray(views)) {
      views.forEach(view => {
        this[view].data(this.model.entries, this.boxBrush, this.timeBrush);
      });
    }
    else {
      // scatter 
      //this.scatter.data(this.model.entries);
      // time series
      this.time.data(this.model.entries, this.boxBrush, this.timeBrush);
      // boxplot
      this.boxplot.data(this.model.entries, this.boxBrush, this.timeBrush);
    }
  }

  onMapUpdated() {
    console.log("update dates", new Date(start.value), new Date(finish.value), selectedRegions);
    start.max = finish.value;
    finish.min = start.value;
    let daysPerRegion = Object.keys(this.model.entriesById);
    let idsToChange = daysPerRegion.filter(id => {
      let regionId = id.split("_")[1];
      return selectedRegions.filter(region => {return regionId == region.id}).length > 0;
    });

    this.model.entries = this.model.entries.map(e => {
      e.selectedTime = false;
      e.selectedRegion = false;
      e.selectedMobility = true;
      return e;
    });

    idsToChange.forEach(id => {
      let entry = this.model.entries[this.model.entriesById[id]];
      if (entry) {
        entry.selectedRegion = true;
        let date = id.split("_")[0];
        entry.selectedTime = new Date(start.value) <= new Date(date) && new Date(finish.value) >= new Date(date);
      }
    });
    this.model.onEntriesListChanged();
  }

  updateTimeSeries() {
    this.time.updateY(selectedTimeType, this.model.entries);
  }

  updateBoxPlot() {
    this.boxplot.updateY(selectedMobility, this.model.entries);
  }

  /**
   * callback raised whenever a new portion of a vis is brushed by the user
   * @param {any} s 
   */
  onBrushChanged(brushMode, d, brush, views, field) {
    if (true) {
      d[field] = brush;
      if (field == "selectedMobility") {
        this.boxBrush = true;
      }
      else {
        this.timeBrush = true;
        this.boxBrush = false;
        brushMobilityButton.disabled = true;
      }
      this.handleUpdateEntry(d, true);
    }
    //else {
    //  this.model.entries = this.model.entries.map(e => {
    //    let date = e.id.split("_")[0];
    //   e.selectedMobility = new Date(start.value) <= new Date(date) && new Date(finish.value) >= new Date(date) && selectedRegions.includes(e.region);
    //    return e;
    //  });
    // reset brush
    //}

    Array.isArray(views) && views.forEach(view => {
      this[view].setBrushMode(brushMode);
    })
  }

  onBrushCompleted(views, restCall) {
    this.model.onEntriesListChanged(views);
  }

  changeTimeHandler(event) {
    selectedTimeType = covidChoice.value;
    console.log("selectedTimeType is ", selectedTimeType);
    window.app.updateTimeSeries();
    window.app.updateBoxPlot();
  }

  changeMobilityHandler(event) {
    let confirmChange = !this.boxBrush ? true : confirm("if you change mobility, all current filters will be lost. Proceed?")
    if (confirmChange) {
      // update view
      this.boxBrush = false;
      brushMobilityButton.disabled = true;
      selectedMobility = mobilityChoice.value;
      console.log("selectedMobility is ", selectedMobility);
      this.model.entries = this.model.entries.map(e => {
        let date = e.id.split("_")[0];
        e.selectedMobility = false;
        e.selectedTime = new Date(start.value) <= new Date(date) && new Date(finish.value) >= new Date(date);
        return e;
      });
      this.updateTimeSeries();
      this.updateBoxPlot();
      this.scatter.data(this.model.entries, this.boxBrush, this.timeBrush);
    }
    else {
      // restore select
      mobilityChoice.value = selectedMobility;
    }
  }

  clearMobility() {
    this.boxBrush = false;
    this.boxplot.setBrushMode(false);
    this.scatter.setBrushMode(false);
    this.boxplot.data(this.model.entries, this.boxBrush);
    this.scatter.data(this.model.entries, this.boxBrush, this.timeBrush);
    brushMobilityButton.disabled = true;
  }

  clearTime() {
    this.timeBrush = false;
    this.boxBrush = false;
    this.boxplot.setBrushMode(false);
    this.scatter.setBrushMode(false);
    this.time.setBrushMode(false);
    start.value = "2020-02-24";
    finish.value = "2020-12-31";
    this.onMapUpdated();
    this.scatter.data(this.model.entries, this.boxBrush, this.timeBrush);
    brushTimeButton.disabled = true;
  }

  computeAggregate() {
    /** ui check */
    restLoading.hidden = false; // show loading scree
    computeButton.disabled = true; // disable button
    let clusters = clusterNumber.value;
    clusterNumber.disabled = true;
    textCluster.textContent = clusters
    /** find index of the element to compute */
    let indexToCompute = this.model.entries.map((data, index) => {
      if(data.selectedRegion){
        if(this.timeBrush){
          return data.selectedTime ? (index+1) : -1
        }
        else{
          return (index+1);
        }
      }
      else{
        return -1;
      }
    }).filter((index) =>{
      return index!=-1;
    });
    // create json obj
    let request = { 
      "selRowNums": indexToCompute,
      "clusters": clusters
    }
    console.log("sending data %o to backend", request);
    /** create xmlhttp req */
    const xmlhttp = new XMLHttpRequest();   // new HttpRequest instance 
    let url = "https://ai18.pythonanywhere.com/dim-reduction";
    xmlhttp.open("POST", url);
    xmlhttp.setRequestHeader("Content-Type", "application/json");
    xmlhttp.setRequestHeader('Access-Control-Allow-Origin', '*');
    xmlhttp.setRequestHeader('Accept', '/*/'); 
    xmlhttp.send(JSON.stringify(request));
    xmlhttp.onreadystatechange = (function (resp) { // Call a function when the state changes.
      if (resp.target.readyState === XMLHttpRequest.DONE && resp.target.status === 200) {
        // Request finished. Do processing here.
        let response = JSON.parse(resp.target.responseText).clusters;
        console.log("received response: %o", response);
        indexToCompute.forEach((recordIndex, index) =>{
          let entry = this.model.entries[recordIndex-1];
          let responseData = response[index];
          entry["Y1"] = responseData[0];
          entry["Y2"] = responseData[1];
          entry["cluster"] = responseData[2];
        });
        restLoading.hidden = true;
        computeButton.disabled = false; // disable button
        clusterNumber.disabled = false;
        this.scatter.data(this.model.entries, this.boxBrush, this.timeBrush);
        this.boxplot.data(this.model.entries, this.boxBrush, this.timeBrush);
      }
    }).bind(this)
  }
}

export default new Controller()
