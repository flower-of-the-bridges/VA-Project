import * as d3 from 'd3'
import * as regions from './../region'
import legend from './map_legend'


export default function () {
  let data = {},
    covidData = {},
    regionData = regions.default,
    width = 360,
    height = 380;

  let updateData;
  let mapColor = null;

  let formatTime = d3.timeParse("%Y-%m-%d");
  // Map and projection
  let projection = d3.geoMercator()
    .center([2, 47])                // GPS of location to zoom on
    .scale(1250)                       // This is like the zoom
    .translate([-width / 7.5, -height / 1000000])

  let mapCallback = () => { console.log("map callback") }
  let onClick = (d) => {
    if (data.clickCount < 3 || d.properties.clicked) {
      d.properties.clicked = !d.properties.clicked;
      if (d.properties.clicked) {
        // if clicked, add in array
        let italyIndex = selectedRegions.findIndex((reg) => reg.id == "0")
        if (italyIndex != -1) {
          // if whole italy is selected, remove it
          selectedRegions.splice(italyIndex, 1)
        }

        selectedRegions.push({ id: d.properties.reg_istat_code, name: d.properties.reg_name.split("/")[0] });
        selectedRegions.sort((a, b) => a.id - b.id)
        // add to recap
        //let node  = document.createElement("p");
        //node.setAttribute("style", "color: "+regionColor(d.properties.reg_istat_code)+"; display: inline;");
        //node.textContent = d.properties.reg_name+"\t";
        //node.id = "regionsRecap"+d.properties.reg_istat_code;
        //regionsRecap.appendChild(node);
      }
      else {
        //otherwise, remove from array
        selectedRegions.splice(selectedRegions.findIndex((reg) => { return reg.id == d.properties.reg_istat_code }), 1);
        //  document.getElementById("regionsRecap"+d.properties.reg_istat_code).remove();
      }
      d.properties.clicked ? data.clickCount++ : data.clickCount--;
      data.wholeMap = data.clickCount == 0;
      if (data.wholeMap) {
        selectedRegions.push({ id: "0", name: "Italy" });
      }
      mapCallback();
      updateData();
      console.log("clicked %o with covidData %o. selected regions: %d", d, covidData[d.properties.reg_istat_code], data.clickCount);
    }
  }
  const map = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append('svg')
        .attr('class', 'bar-chart')
        .attr('height', height)
        .attr('width', width);

      updateData = function () {
        if (svg.select("#map").empty()) {
          // if map group doesn't exist, create it
          svg.append("g")
            .attr("id", "map")
            .attr('height', height)
            .attr('width', width);
        }
        // change threshold limit according to month. before august, cases detected where
        // lower due to shortness of case detection 
        let thresholdLimit = formatTime(finish.value).getMonth()<8 ? 1000 : 5000
      
        mapColor = d3.scaleQuantize([1, thresholdLimit], d3.schemeReds[9])
        console.log("threshold limit is", thresholdLimit, finish.value, formatTime(finish.value));
        svg.select("#mapLegend").remove();
        svg.append("g")
          .attr("id", "mapLegend")
          .attr("transform", "translate(" + (width/6) + ","+(height - 50)+")")
          .append(() => legend({
            color: mapColor,
            title: "new cases for 100k inhabitants",
            width: 200,
            thresholdLimit: thresholdLimit
          }));

        // Draw the map
        svg.select("#map")
          .selectAll("path")
          .data(data.features) // set features
          .join(
            enter => enter
              .append("path")
              .attr("fill", d => mapColor(covidData[d.properties.reg_istat_code] != null ? covidData[d.properties.reg_istat_code].casesXpeople : "black")) // first time, no region is selected: all white 
              .attr("d", d3.geoPath()
                .projection(projection)
              )
              .style("stroke", d => d.properties.clicked ? regionColor(d.properties.reg_istat_code) : (data.clickCount == 0 ? regionColor(0) : "black"))
              .attr("stroke-width", "2")
              .on("click", d => {
                onClick(d);
              }),
            update => update
              // change fill property based on the selection
              .call(update => update
                .transition()
                .duration(1000)
                .attr("fill", d => mapColor(covidData[d.properties.reg_istat_code] != null ? covidData[d.properties.reg_istat_code].casesXpeople : "black"))
                .style("stroke", d => d.properties.clicked ? regionColor(d.properties.reg_istat_code) : regionColor(0))
                .attr("stroke-width", d => d.properties.clicked || data.clickCount == 0 ? "2" : "1.5")
                //.attr("opacity", d => data.wholeMap ? '1' : (d.properties.clicked ? '1' : '.5'))
                //.style('fill', d => d.properties.clicked ? regionColor(d.properties.reg_istat_code) : regionColor(0))
              ),
            exit => exit
              .call(exit => exit
                .transition()
                .duration(650)
                .remove()
              )
          )
      }
    })
  }
  //
  map.data = function (mapData, dataset) {
    if (!arguments.length) return data
    data = mapData;



    if (typeof updateData === 'function') {
      // resets lcaol covid data (cases x 100k inabhitants)
      covidData = {};

      // first: compute cases x region
      dataset.forEach(d => {
        if (formatTime(start.value) <= d.date && formatTime(finish.value) >= d.date && d.region != "0") {
          // check first if data is selected and its an actual region
          if (!covidData[d.region]) {
            // create entry within local data if empty
            covidData[d.region] = {
              cases: [],
              avg: 0,
              casesXpeople: 0 // cases x 100k people
            }
          }
          covidData[d.region].cases.push(d.new);
        }
      });
      // then, compute avg and cases for every 100k 
      Object.keys(covidData).forEach(region => {
        let total = 0;
        // sum daily new cases to total
        covidData[region].cases.forEach(caseDay => {
          total += Number(caseDay)
        })
        // comput avg
        covidData[region].avg = total / covidData[region].cases.length
        covidData[region].casesXpeople = total / regionData[region] * (region != 22 ? 100000 : 50000)
      });
      updateData()
    }
    return map
  }
  //
  map.bindCallback = (callback) => mapCallback = callback
  //
  return map
}
