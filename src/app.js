import * as d3 from 'd3'

import controller from './controller'
import demo from './res/demo.csv'
import covidData from './res/covid.csv'
import mobilityData from './res/mobility.csv'
import dataset from './res/dataset.csv'

const app = async function () {
  window.app = controller
  /** 
  loadData()
    .then(() => {
      // Create ascending container
      const ascendingContainer = d3.select('#root')
        .append('div')
        .attr('id', '#bar__ascending')
      // Invoke ascending view function
      ascendingContainer.call(window.app.barchartAscending)
      // Create descending container
      const descendingContainer = d3.select('#root')
        .append('div')
        .attr('id', '#bar__descending')
      // Invoke descending view function
      descendingContainer.call(window.app.barchartDescending)
    })
    .catch(err =>{
      console.log("error loading data: %o", err)
    })
  */
  //await preProcessData();
  let loaded = await loadData()
    .catch(err => {
      console.log(err);
    });

  if (loaded) {
    console.log("model loaded. entry #5000: %o", controller.model.entries[5000]);
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
    d3.csv(dataset)
      .then(entries => {
        entries.forEach(e => {
          controller.handleAddEntry({
            ...e,
            selected: false
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
        entries.forEach((e, index) => {
          controller.addMobilityData(e)
        })
        resolve(true)
      })
      .catch(error => reject(error))
  })
}

export default app
