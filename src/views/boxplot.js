import * as d3 from 'd3'
import { functions } from '../util'
import * as regions from './../region'

export default function () {
  let data = [];

  let yTopic = "";

  let regionData = regions.default;

  let brushMode = false;
  let boxBrush = false;
  let timeBrush = false;
  let scatterBrush = false;
  let brush = null;
  let lastBrush = 0;

  let brushes = [];
  let updateData, highlight, brushended;

  // rectangle for the main box
  let boxWidth = 100

  let width = 450, height = 330;
  let margin = { top: 20, right: 10, bottom: 30, left: 30 };

  let actualWidth = width - margin.left - margin.right;
  let actualHeight = height - margin.top - margin.bottom;

  let x = d3.scaleBand().range([0, actualWidth]),
    y = d3.scaleLinear().range([actualHeight, 0]);

  let xAxis, yAxis;

  let idleTimeout, idleDelay = 350;

  /** variables used to found brush x size */
  let minElement, maxElement = null;

  let idled = function () {
    idleTimeout = null;
  }

  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (mode) => { console.log("brush completed ", mode) }

  let views = ["scatter", "time"]

  const boxplot = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr('viewBox', '0 0 ' + width + ' ' + height);
      // .attr("width", actualWidth + 7 * (margin.left + margin.right))
      // .attr("height", height + margin.top + margin.bottom);

      svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
      // .attr("width", actualWidth)
      // .attr("height", height);

      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + (margin.left - 10) + "," + (10 + margin.top) + ")");

      let createLegend = function (legend) {
        selectedRegions.forEach((region, index) => {
          legend.append("circle").attr("cx", actualWidth + 4 * margin.right).attr("cy", (index + 1) * margin.top).attr("r", 6).style("fill", regionColor(region.id))
          legend.append("text").attr("x", actualWidth + 5 * margin.right).attr("y", (index + 1) * margin.top + 4.5).text(region.name).style("font-size", "13px").attr("alignment-baseline", "middle")
        })
      }

      updateData = function () {
        functions.logViewStatus("boxplot", data.length, timeBrush, boxBrush, scatterBrush)
        // set brush range
        let regionRange = d3.extent(data, function (d) { return d.region; });
        minElement = regionRange[0];
        maxElement = regionRange[1];
        // Handmade legend
        svg.select("#legend").remove();
        let legend = svg.append("g")
          .attr("id", "legend")
          .attr("class", "focus")
          .attr("background", "lightsteelblue")
          .attr("transform", "translate(" + (margin.left - 40) + "," + (20 + margin.top) + ")");
        createLegend(legend);

        if (!brushMode && brush) {
          // remove brush if any
          focus.select(".brush").call(brush.move, null);
        }
        // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
        const sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
          .key(function (d) { return regionData[d.region].name; })
          .rollup(function (d) {
            let q1 = d3.quantile(d.map(function (g) { return +g[yTopic]; }).sort(d3.ascending), .25)
            let median = d3.quantile(d.map(function (g) { return +g[yTopic]; }).sort(d3.ascending), .5)
            let q3 = d3.quantile(d.map(function (g) { return +g[yTopic]; }).sort(d3.ascending), .75)
            let interQuantileRange = q3 - q1
            let min = d3.min(d.map(function (g) { return +g[yTopic]; }))//q1 - interQuantileRange
            let max = d3.max(d.map(function (g) { return +g[yTopic]; }))//q3 + interQuantileRange
            return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
          })
          .entries(data)

        x.domain(selectedRegions.map(region => { return regionData[region.id].name }))
          .paddingInner(1)
          .paddingOuter(.5);
        y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
        /** boxplot */

        xAxis = d3.axisBottom(x).tickFormat((_) => "");
        yAxis = d3.axisLeft(y);

        focus.select("g.axis--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis--x")
          .attr("transform", "translate(0," + y(0) + ")")
          .call(xAxis);

        focus.select("g.axis--y").remove();
        focus.append("g")
          .attr('id', "axis--y")
          .attr("class", "axis axis--y")
          .call(yAxis);

        // Show the main vertical lines
        focus.selectAll("#vert-lines-up").remove();
        const linesUp = focus
          .selectAll("vertLines")
          .data(sumstat);

        linesUp
          .enter()
          .append("line")
          .attr("id", "vert-lines-up")
          .attr("x1", function (d) { return (x(d.key)) })
          .attr("x2", function (d) { return (x(d.key)) })
          .attr("y1", function (d) { return (y(d.value.q3)) })
          .attr("y2", function (d) { return (y(d.value.max)) })
          .attr("stroke", "black")
          .attr("stroke-dasharray", "5,5")
          .style("width", 40)

        focus.select("#vert-lines-up").lower();

        focus.selectAll("#vert-lines-down").remove();
        const linesDown = focus
          .selectAll("vertLines")
          .data(sumstat);

        linesDown
          .enter()
          .append("line")
          .attr("id", "vert-lines-down")
          .attr("x1", function (d) { return (x(d.key)) })
          .attr("x2", function (d) { return (x(d.key)) })
          .attr("y1", function (d) { return (y(d.value.q1)) })
          .attr("y2", function (d) { return (y(d.value.min)) })
          .attr("stroke", "black")
          .attr("stroke-dasharray", "5,5")
          .style("width", 40)

        focus.select("#vert-lines-down").lower();

        // show max lines
        focus.selectAll("#max-lines").remove();
        const maxLines = focus
          .selectAll("maxLines")
          .data(sumstat);

        maxLines
          .enter()
          .append("line")
          .attr("id", "max-lines")
          .attr("x1", function (d) { return (x(d.key) - boxWidth / 4) })
          .attr("x2", function (d) { return (x(d.key) + boxWidth / 4) })
          .attr("y1", function (d) { return (y(d.value.max)) })
          .attr("y2", function (d) { return (y(d.value.max)) })
          .attr("stroke", "black")
          .attr("stroke-width", 2)

        /** TEXT */
        focus.selectAll(".boxtext").remove();
        const maxText = focus
          .selectAll("maxText")
          .data(sumstat);
        maxText
          .enter()
          .append("text")
          .attr("x", function (d) { return (x(d.key) + boxWidth / 2) + 5 })
          .attr("y", function (d) { return (y(d.value.max) + 3) })
          .attr("text-anchor", "right")
          .attr("class", "boxtext").attr("font-weight", "bold")
          .text(function (d) { return d.value.max + "%" });

        const minText = focus
          .selectAll("minText")
          .data(sumstat);
        minText
          .enter()
          .append("text")
          .attr("x", function (d) { return (x(d.key) + boxWidth / 2) + 5 })
          .attr("y", function (d) { return (y(d.value.min) + 3) })
          .attr("text-anchor", "right")
          .attr("class", "boxtext").attr("font-weight", "bold")
          .text(function (d) { return d.value.min + "%" });

        const q1Text = focus
          .selectAll("q1Text")
          .data(sumstat);
        q1Text
          .enter()
          .append("text")
          .attr("x", function (d) { return (x(d.key) + boxWidth / 2) + 5 })
          .attr("y", function (d) { return (y(d.value.q1) + 10) })
          .attr("text-anchor", "right")
          .attr("class", "boxtext").attr("font-weight", "bold")
          .text(function (d) { return d.value.q1 + "%" });

        const q3Text = focus
          .selectAll("q3Text")
          .data(sumstat);
        q3Text
          .enter()
          .append("text")
          .attr("x", function (d) { return (x(d.key) + boxWidth / 2) + 5 })
          .attr("y", function (d) { return (y(d.value.q3) - 4) })
          .attr("text-anchor", "right")
          .attr("class", "boxtext").attr("font-weight", "bold")
          .text(function (d) { return d.value.q3 + "%" });

        const medianText = focus
          .selectAll("medianText")
          .data(sumstat);
        medianText
          .enter()
          .append("text")
          .attr("x", function (d) { return (x(d.key) + boxWidth / 2) + 5 })
          .attr("y", function (d) { return (y(d.value.median)) })
          .attr("text-anchor", "right")
          .attr("class", "boxtext").attr("font-weight", "bold")
          .text(function (d) { return d.value.median + "%" });

        // show min lines
        focus.selectAll("#min-lines").remove();
        const minLines = focus
          .selectAll("minLines")
          .data(sumstat);

        minLines
          .enter()
          .append("line")
          .attr("id", "min-lines")
          .attr("x1", function (d) { return (x(d.key) - boxWidth / 4) })
          .attr("x2", function (d) { return (x(d.key) + boxWidth / 4) })
          .attr("y1", function (d) { return (y(d.value.min)) })
          .attr("y2", function (d) { return (y(d.value.min)) })
          .attr("stroke", "black")
          .attr("stroke-width", 2)

        // show the main boxes
        focus.selectAll("#boxes").remove();

        focus
          .selectAll("boxes")
          .data(sumstat)
          .enter()
          .append("rect")
          .attr("id", "boxes")
          .attr("x", function (d) { return (x(d.key) - boxWidth / 2) })
          .attr("y", function (d) { return (y(d.value.q3)) })
          .attr("height", function (d) { return (y(d.value.q1) - y(d.value.q3)) })
          .attr("width", boxWidth)
          .attr("stroke", "black")
          .attr("opacity", ".8")
          .style("fill", (d) => regionColor(Object.keys(regionData).filter(reg => { return regionData[reg].name == d.key })[0]));

        focus.select("#boxes").lower();

        // Show the median
        focus.selectAll("#median-lines").remove();
        focus
          .selectAll("medianLines")
          .data(sumstat)
          .enter()
          .append("line")
          .attr("id", "median-lines")
          .attr("x1", function (d) { return (x(d.key) - boxWidth / 2) })
          .attr("x2", function (d) { return (x(d.key) + boxWidth / 2) })
          .attr("y1", function (d) { return (y(d.value.median)) })
          .attr("y2", function (d) { return (y(d.value.median)) })
          .attr("stroke", "black")
          .style("width", 80);

        // Add individual points with jitter
        var jitterWidth = boxWidth - 20;

        focus.selectAll("#data-points").remove();
        let points = focus
          .selectAll("circle")
          .data(data);

        points.enter()
          .append("circle")
          .merge(points)
          .attr("id", "data-points")
          .attr("class", "dot")
          .attr("cx", function (d) { return (x(regionData[d.region].name) - jitterWidth / 2 + d.jitter * jitterWidth) })
          .attr("cy", function (d) { return (y(d[yTopic])) })
          .attr("r", 4)
          .style("fill", (d) => regionColor(d.region))
          .attr("opacity", d => {
            //if (!brushMode) {
            //  return '1';
            //}
            //else {
            //  d.selectedMobility ? '1' : '.5';
            //}
            if (scatterBrush || boxBrush) {
              return functions.isDrawable(d, timeBrush, boxBrush, scatterBrush) ? "1" : "0"
            }
            else
              return '0'
          })
          .attr("stroke", "black")


        /** AXIS */

        if (focus.select("#y-text-label").empty()) {
          focus.append("text")
            .attr("id", "y-text-label")
            .attr("y", y(0) - 10)//- (actualHeight / 2))
            .attr("x", - 1.2 * margin.left)//- margin.left )
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            //.attr("font-weight", "bold")
            .attr("font-size", "1.5em")
            .text("%");
        }

        if (focus.select("#boxbrush").empty()) {

          highlight = function (newY, region) {
            console.log("zoom");
            let transition = svg.transition().duration(750);
            svg.selectAll("#data-points").transition(transition)
              .attr("opacity", function (d) {
                // if point brushed is from same region where brush 
                // has been called, updated it 
                let yValue = newY && newY(d[yTopic]);
                onBrush(
                  brushMode, // brush mode
                  d, // value to update
                  region == d.region ? newY && yValue >= newY.range()[1] && yValue <= newY.range()[0] : d.selectedMobility,
                  views, // views to update
                  "selectedMobility" // field to update
                );
                return region == d.region ?
                  (newY && yValue >= newY.range()[1] && yValue <= newY.range()[0] ? '1' : '0')
                  : this.getAttribute("opacity");
              })
          }
          brushended = function (region) {
            let s = d3.event.selection;
            console.log("brushnede", s, region)
            let newY = null;
            if (!s) {
              //if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
              //newY = y;
              //brushMode = false;
            } else {
              brushMobilityButton.disabled = false;
              newY = y.copy();
              newY.domain(s.map(newY.invert, newY));
              //focus.select(".brush").call(brush.move, null);
              brushMode = true;
              highlight(newY, region);
              onBrushCompleted(brushMode ? views : null);
            }
          }
        }

        /** brush section:
         *  here we create a brush for each region, maybe we want to explore same behaviour 
         *  on mobility wrt different pandemic situations
         */
        //console.log("removing %d brushes", lastBrush)
        //for (let i = 0; i < lastBrush; i++) {
        //  // remove previous iteration of brush for region
        //  focus.select("#boxbrush" + lastBrush).remove();
        //}
        d3.selectAll(".boxbrush").remove();
        lastBrush = 0;
        selectedRegions.forEach(region => {
          // create new brush for region
          let mybrush = d3.brushY()
            .extent([[x(regionData[region.id].name) - boxWidth / 2, 0], [x(regionData[region.id].name) + boxWidth / 2, actualHeight]])
            .on("end", () => { console.log(region.id); brushended(region.id) })
          brushes.push(mybrush)
          lastBrush++;
          focus.append("g")
            .attr("class", "boxbrush")
            .attr("id", "boxbrush" + lastBrush)
            .call(mybrush);

        })

      }
    })
  }

  boxplot.data = function (_, boxBrushed, timeBrushed, scatterBrushed) {
    if (!arguments.length) {
      return data
    }
    data = _;
    if (boxBrush != null) {
      brushMode = boxBrushed;
    }
    boxBrush = boxBrushed
    timeBrush = timeBrushed
    scatterBrush = scatterBrushed
    if (typeof updateData === 'function') {
      data = data.filter(d => { return d.selectedRegion && d.selectedTime });
      updateData()
    }
    return boxplot
  }

  boxplot.updateY = function (newY, newData) {
    if (!arguments.length) {
      return data
    }
    yTopic = newY
    if (typeof updateData === 'function') {
      data = newData.filter(d => { return d.selectedRegion && d.selectedTime });
      brushMode = false;
      updateData()
    }
    return boxplot
  }

  boxplot.setBrushMode = function (mode) {
    brushMode = mode;
    return boxplot
  }

  // bindings
  boxplot.bindBrush = (callback) => onBrush = callback
  boxplot.bindBrushComplete = (callback) => onBrushCompleted = callback

  return boxplot;
}
