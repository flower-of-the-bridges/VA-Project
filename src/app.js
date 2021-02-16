import * as d3 from 'd3'

import controller from './controller'
import covidData from './res/covid.csv'
import mobilityData from './res/mobility.csv'
import dataset from './res/dataset.csv'

const app = async function () {
  window.app = controller;
  window.selectedRegions = [{ id: "0", name: "Italy" }];
  initUI();
  //await preProcessData();
  window.regionColor = d3.scaleOrdinal(d3.schemeTableau10);
  window.clusterColor = d3.scaleOrdinal(d3.schemeSet3);

  let mapLoaded = await loadMap()
    .catch(err => {
      console.log(err);
    });

  let loaded = await loadData()
    .catch(err => {
      console.log(err);
    });

  if (loaded && mapLoaded) {
    console.log("model loaded. entry #5000: %o", controller.model.entries[5000]);
    // Create container
    const scatterContainer = d3.select('#scatter');
    const timeContainer = d3.select('#time')
      .append("div")
      .attr("id", "#timeView");
    const boxContainer = d3.select('#mobility');
    const mapContainer = d3.select('#map');
    // Invoke view function
    scatterContainer.call(window.app.scatter);
    timeContainer.call(window.app.time);
    boxContainer.call(window.app.boxplot);
    mapContainer.call(window.app.mapView);
    window.app.onEntriesListChanged();
    window.app.computeAggregate();
  }

}

const preProcessData = async function () {
  let result = await loadCovidData()
    .catch(err => {
      console.log(err);
    });

  if (result) {
    loadMobilityData()
      .then(() => {
        controller.saveDataset();
      })
      .catch(err => {
        console.log(err);
      })

  }
}

/**
 * loads the map 
 * 
 * */
const loadMap = function () {
  return new Promise((resolve, reject) => {
    //The format in the json, which d3 will read
    d3.json("https://raw.githubusercontent.com/openpolis/geojson-italy/master/geojson/limits_IT_regions.geojson")
      .then(geoJson => {
        geoJson.features.forEach(feature => {
          feature.properties.clicked = false;
        });
        geoJson.clickCount = 0;
        geoJson.wholeMap = true;
        controller.handleMapData(geoJson);
        resolve(true)
      })
      .catch(err => {
        reject(err);
      })
  })
}

// Load data
const loadData = function () {
  return new Promise((resolve, reject) => {
    //The format in the CSV, which d3 will read
    var formatTime = d3.timeParse("%Y-%m-%d");
    d3.csv(dataset)
      .then(entries => {
        entries.forEach((e) => {
          e.date = formatTime(e.date);
          controller.handleAddEntry({
            ...e,
            jitter: Math.random(),
            selectedMobility: true,//formatTime(start.value) <= e.date && formatTime(finish.value) >= e.date && selectedRegions.includes(e.region),
            selectedTime: formatTime(start.value) <= e.date && formatTime(finish.value) >= e.date,
            selectedRegion: selectedRegions.filter(region => { return e.region == region.id }).length > 0
          })
        })
        resolve(true)
      })
      .catch(error => reject(error))
  })
}

const loadCovidData = function () {
  return new Promise((resolve, reject) => {
    d3.csv(covidData)
      .then(entries => {
        entries.forEach((e, index) => {
          controller.addCovidData(e, index)
        })
        resolve(true)
      })
      .catch(error => reject(error))
  })
}

const loadMobilityData = function () {
  return new Promise((resolve, reject) => {
    d3.csv(mobilityData)
      .then(entries => {
        entries.forEach((e) => {
          controller.addMobilityData(e)
        })
        resolve(true)
      })
      .catch(error => reject(error))
  })
}

const initUI = function () {

  start.value = "2020-02-24";
  finish.value = "2020-12-31";
  brushMobilityButton.disabled = true;
  brushTimeButton.disabled = true;
  // init dates
  start.max = finish.value;
  finish.min = start.value;
  // init time series buttons with callback
  window.selectedTimeType = covidChoice.value
  window.app.updateTimeSeries();
  console.log("selectedTimeType is ", selectedTimeType);
  // init boxplot buttons with callback
  window.selectedMobility = mobilityChoice.value;
  window.app.updateBoxPlot();
  console.log("selectedMobility is ", window.selectedMobility);
  brushTime.checked = true;
  //zoomTime.checked = false;
  let timeModeRadios = document.querySelectorAll('input[type=radio][name="timeMode"]');
  function setTimeMode(event) {
    let mode = this.id == zoomTime.id && this.checked
    console.log("setting time mode: ", mode);
    window.app.time.setZoomMode(mode);
  }
  timeModeRadios.forEach(radio => {
    console.log(radio);
    radio.addEventListener("change", setTimeMode)
  })  
}

export default app
