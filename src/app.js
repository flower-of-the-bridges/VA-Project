import * as d3 from 'd3'

import controller from './controller'
import demo from './res/demo.csv'
import covidData from './res/covid.csv'
import mobilityData from './res/mobility.csv'
import dataset from './res/pca.csv'

const app = async function () {
  window.app = controller;

  initUI();
  //await preProcessData();

  let loaded = await loadData()
    .catch(err => {
      console.log(err);
    });

  if (loaded) {
    console.log("model loaded. entry #5000: %o", controller.model.entries[5000]);
    // Create container
    const scatterContainer = d3.select('#scatter');
    const timeContainer = d3.select('#time')
      .append("div")
      .attr("id", "#timeView");
    const boxContainer = d3.select('#mobility');
    // Invoke view function
    scatterContainer.call(window.app.scatter);
    timeContainer.call(window.app.time);
    boxContainer.call(window.app.boxplot);

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
            brushed: false,
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

const initUI = function () {

  // init dates
  start.max = finish.value;
  finish.min = start.value;
  // init region radio buttons with callback
  window.regionRadios = document.querySelectorAll('input[type=radio][name="region"]');
  window.regionRadios.forEach(radio => {
    if (radio.checked) {
      window.selectedRegion = radio.value
    }
  });
  console.log("selectedRegion is ", selectedRegion);
  function changeHandler(event) {
    selectedRegion = this.value;
    console.log("selectedRegion is ", selectedRegion);
    window.app.updateEntries();
  }

  regionRadios.forEach(radio => {
    radio.addEventListener('change', changeHandler);
  });

  // init time series buttons with callback
  window.timeRadios = document.querySelectorAll('input[type=radio][name="covid"]');
  window.timeRadios.forEach(radio => {
    if (radio.checked) {
      window.selectedTimeType = radio.value
      window.app.updateTimeSeries();
    }
  });
  console.log("selectedTimeType is ", selectedTimeType);
  function changeTimeHandler(event) {
    selectedTimeType = this.value;
    console.log("selectedTimeType is ", selectedTimeType);
    window.app.updateTimeSeries();
  }

  timeRadios.forEach(radio => {
    radio.addEventListener('change', changeTimeHandler);
  });

  // init boxplot buttons with callback
  window.mobRadios = document.querySelectorAll('input[type=radio][name="mobil"]');
  window.mobRadios.forEach(radio => {
    if (radio.checked) {
      window.selectedMobility = radio.value
      window.app.updateBoxPlot();
    }
  });
  console.log("selectedMobility is ", selectedMobility);
  function changeMobilityHandler(event) {
    selectedMobility = this.value;
    console.log("selectedMobility is ", selectedMobility);
    window.app.updateBoxPlot();
  }

  mobRadios.forEach(radio => {
    radio.addEventListener('change', changeMobilityHandler);
  });


}

export default app
