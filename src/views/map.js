import * as d3 from 'd3'
import * as regions from './../region'
import legend from './map_legend'


export default function () {
  let data = {},
    covidData = {},
    regionData = regions.default,
    width = 360,
    height = 350;

  let updateData;
  let mapColor = null;

  let thresholds = {
    new: [1000, 5000],
    healed: [50000, 100000],
    isolated: [30000, 80000],
    positives: [50000, 100000],
    hospitalized: [10000, 10000],
    intensiveCare: [1000, 1000],
    death: [200, 200]
  }

  let colors = {
    new: d3.schemeReds[9],
    healed: d3.schemeGreens[9],
    isolated: d3.schemeOranges[9],
    positives: d3.schemeReds[9],
    hospitalized: d3.schemeReds[9],
    intensiveCare: d3.schemeReds[9],
    death: d3.schemeReds[9]
  }

  let formatTime = d3.timeParse("%Y-%m-%d");
  // Map and projection
  // let projection = d3.geoMercator()
  //   .center([2, 47])                // GPS of location to zoom on
  //   .scale(1250)                       // This is like the zoom
  //   .translate([-width / 7.5, -height / 1000000])

  // Geographic projection
  let projection = d3.geoAzimuthalEqualArea()
    .clipAngle(180 - 1e-3)
    .scale(1700)
    .rotate([-12.22, -42, 0])
    .translate([width / 2, height / 2.2])
    .precision(0.1)

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

  let createPattern = (svg, color, id) => {
    svg.append("pattern")
      .attr("id", id)
      .attr("width", 10)
      .attr("height", 10)
      .attr("patternTransform", "rotate(45 0 0)")
      .attr("patternUnits", "userSpaceOnUse")
      .append("line")
        .attr("x1", "0")
        .attr("x2", "0")
        .attr("y1", "0")
        .attr("y2", "10")
        .style("stroke", color)
        .style("stroke-width", "3")
  }
  let createPatternForRegions = () => {
    selectedRegions.forEach(region =>{
      createPattern(regionColor(region.id), region.id)
    })
    
  } 
  const map = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append('svg')
        .attr('viewBox', '0 0 ' + width + ' ' + height);
      // .attr('height', height)
      // .attr('width', width);

      updateData = function () {
        if (svg.select("#map").empty()) {
          // if map group doesn't exist, create it
          svg.append("g")
            .attr("id", "map")

          svg.append("g")
            .attr("id", "map2")

            //  width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        }
        // change threshold limit according to month. before august, cases detected where
        // lower due to shortness of case detection 
        let thresholdLimit = formatTime(finish.value).getMonth() < 9 && formatTime(finish.value).getFullYear() == "2020" ? thresholds[selectedTimeType][0] : thresholds[selectedTimeType][1]

        mapColor = d3.scaleQuantize([1, thresholdLimit], colors[selectedTimeType])
        console.log("threshold limit is", thresholdLimit, finish.value, formatTime(finish.value));
        svg.select("#mapLegend").remove();
        svg.append("g")
          .attr("id", "mapLegend")
          .attr("transform", "translate(" + (width / 80) + "," + (height - 50) + ")")
          .append(() => legend({
            color: mapColor,
            title: selectedTimeType + " case for 100k inhabitants",
            width: 320,
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
              //.on("click", d => {
              //  onClick(d);
              //})
              ,
            update => update
              // change fill property based on the selection
              .call(update => update
                .transition()
                .duration(1000)
                .attr("fill", d => mapColor(covidData[d.properties.reg_istat_code] != null ? covidData[d.properties.reg_istat_code].casesXpeople : "black"))
                //.style("stroke", d => d.properties.clicked ? regionColor(d.properties.reg_istat_code) : regionColor(0))
                //.attr("stroke-width", d => d.properties.clicked || data.clickCount == 0 ? "2" : "1.5")
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

        svg.select("#map2")
          .selectAll("path")
          .data(data.features) // set features
          .join(
            enter => enter
              .append("path")
              .attr("fill", d => {
                createPattern(svg, regionColor("0"), "0")
                return d.properties.clicked ? regionColor(d.properties.reg_istat_code) : (data.clickCount == 0 ? regionColor(0) : "black")}) // first time, no region is selected: all white 
              .attr("d", d3.geoPath()
                .projection(projection)
              )
              .style("stroke", d => d.properties.clicked ? regionColor(d.properties.reg_istat_code) : (data.clickCount == 0 ? regionColor(0) : "black"))
              .attr("stroke-width", "2")
              .attr("opacity", d => d.properties.clicked ? "1" : "0")
              .on("click", d => {
                onClick(d);
              }),
            update => update
              // change fill property based on the selection
              .call(update => update
                .transition()
                .duration(500)
                .attr("fill", d => {
                  d.properties.clicked && createPattern(svg, regionColor(d.properties.reg_istat_code), d.properties.reg_istat_code); 
                  return d.properties.clicked ? "url(#"+d.properties.reg_istat_code+")" : ""
                })
                .style("stroke", d => d.properties.clicked ? regionColor(d.properties.reg_istat_code) : regionColor(0))
                .attr("stroke-width", d => d.properties.clicked || data.clickCount == 0 ? "2" : "1.5")
                .attr("opacity", d => d.properties.clicked ? "1" : "0")
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
              casesXpeople: 0, // cases x 100k people
            }
          }

          covidData[d.region].cases.push(d[selectedTimeType]);
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
        covidData[region].casesXpeople = total / regionData[region].population * (region != 22 ? 100000 : 50000)
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
