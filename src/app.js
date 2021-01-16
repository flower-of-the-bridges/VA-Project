import * as d3 from 'd3'

import controller from './controller'
import demo from './res/demo.csv'
import covidData from './res/covid.csv'
import mobilityData from './res/mobility.csv'
import dataset from './res/pca.csv'

const app = async function () {
  window.app = controller;
  // init dates
  start.max = finish.value;
  finish.min = start.value;
  // init radio buttons with callback
  window.radios = document.querySelectorAll('input[type=radio][name="region"]');
  window.radios.forEach(radio => {
    if(radio.checked){
      window.selectedRegion = radio.value
    }
  });
  console.log("selectedRegion is ", selectedRegion);
  function changeHandler(event) {
    selectedRegion = this.value;
    console.log("selectedRegion is ", selectedRegion);
    window.app.updateEntries();
  }

  radios.forEach(radio => {
    radio.addEventListener('change', changeHandler);
  });

  //await preProcessData();

  let loaded = await loadData()
    .catch(err => {
      console.log(err);
    });

  if (loaded) {
    console.log("model loaded. entry #5000: %o", controller.model.entries[5000]);
    // Create container
    const scatterContainer = d3.select('#scatter');
    // Invoke view function
    scatterContainer.call(window.app.scatter);
    const timeContainer = d3.select('#time');
    timeContainer.call(window.app.time);
    window.app.onEntriesListChanged();
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
            selected: formatTime(start.value) <= e.date && formatTime(finish.value) >= e.date && e.region == selectedRegion
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

export default app
