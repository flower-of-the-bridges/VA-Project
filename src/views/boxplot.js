import * as d3 from 'd3'

export default function () {
  let data = [];

  let yTopic = "";

  let brushMode = false;
  let brush = null;
  let lastBrush = 0;

  let updateData, highlight, brushended;

  // rectangle for the main box
  let boxWidth = 100

  let margin = { top: 20, right: 30, bottom: 30, left: 30 };

  let width = 450 - margin.left - margin.right;
  let height = 250 - margin.top - margin.bottom;

  let x = d3.scaleBand().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

  let xAxis, yAxis;

  let idleTimeout, idleDelay = 350;

  let idled = function () {
    idleTimeout = null;
  }

  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (mode) => { console.log("brush completed ", mode) }

  let views = ["scatter"]

  const boxplot = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr("width", width + 3* (margin.left + margin.right))
        .attr("height", height + margin.top + margin.bottom);

      svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let createLegend = function (legend) {
        legend.append("rect")
          .attr("x", width + margin.right)
          .attr("y", 0)
          .style("fill", "lightsteelblue")
          .attr("height", (margin.top)*(selectedRegions.length+1))
          .attr("width", margin.right*4.8)
        selectedRegions.forEach((region, index) => {
          legend.append("circle").attr("cx",  width + 1.5*margin.right).attr("cy", (index + 1) * margin.top).attr("r", 6).style("fill", regionColor(region.id))
          legend.append("text").attr("x", width + 2*margin.right).attr("y", (index + 1) * margin.top + 4.5).text(region.name).style("font-size", "13px").attr("alignment-baseline", "middle")
        })
        
      }

      updateData = function () {
        // Handmade legend
        svg.select("#legend").remove();
        let legend = svg.append("g")
          .attr("id", "legend")
          .attr("class", "focus")
          .attr("background", "lightsteelblue");
        createLegend(legend);
        console.log("boxplot has %d elements. (brush mode: %s)", data.length, brushMode ? "on" : "off");
        if (!brushMode && brush) {
          // remove brush if any
          focus.select(".brush").call(brush.move, null);
        }
        // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
        const sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
          .key(function (d) { return d.region; })
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

        x.domain(selectedRegions.map(region => {return region.id}))
          .paddingInner(1)
          .paddingOuter(.5);
        y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
        /** boxplot */

        // Show the main vertical line
        focus.selectAll("#vert-lines").remove();
        const lines = focus
          .selectAll("vertLines")
          .data(sumstat);

        lines
          .enter()
          .append("line")
          .attr("id", "vert-lines")
          .attr("x1", function (d) { return (x(d.key)) })
          .attr("x2", function (d) { return (x(d.key)) })
          .attr("y1", function (d) { return (y(d.value.min)) })
          .attr("y2", function (d) { return (y(d.value.max)) })
          .attr("stroke", "black")
          .style("width", 40)

        focus.select("#vert-lines").lower();

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
          .style("fill", "#69b3a2");

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
        var jitterWidth = 50;

        focus.selectAll("#data-points").remove();
        let points = focus
          .selectAll("circle")
          .data(data);

        points.enter()
          .append("circle")
          .merge(points)
          .attr("id", "data-points")
          .attr("class", "dot")
          .attr("cx", function (d) { return (x(d.region) - jitterWidth / 2 + d.jitter * jitterWidth) })
          .attr("cy", function (d) { return (y(d[yTopic])) })
          .attr("r", 4)
          .style("fill", (d) => regionColor(d.region))
          .attr("opacity", d => {
            if (!brushMode) {
              return '1';
            }
            else {
              d.selectedMobility ? '1' : '.5';
            }
          })
          .attr("stroke", "black")


        /** AXIS */
        xAxis = d3.axisBottom(x);
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

        focus.append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0 - margin.left / 2)
          .attr("x", 0 - (height / 2))
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text("%");

        if (focus.select("#boxbrush").empty()) {

          highlight = function (newY) {
            console.log("zoom");
            let transition = svg.transition().duration(750);
            svg.selectAll("#data-points").transition(transition)
              .attr("opacity", function (d) {
                let yValue = newY && newY(d[yTopic]);
                onBrush(
                  brushMode, // brush mode
                  d, // value to update
                  newY && yValue >= newY.range()[1] && yValue <= newY.range()[0],
                  views, // views to update
                  "selectedMobility" // field to update
                );
                return newY && yValue >= newY.range()[1] && yValue <= newY.range()[0] ? '1' : '.5';
              })
          }
          brushended = function () {
            let s = d3.event.selection;
            console.log("brushnede", s)
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
              highlight(newY);
              onBrushCompleted(brushMode ? views : null);
            }
          }
        }

        if (brush && !brushMode) {
          focus.select("boxbrush" + lastBrush).remove();
        }

        if (!brush) {
          brush = d3.brushY().extent([[0, 0], [width, height]]).on("end", brushended)
          lastBrush++;
          focus.append("g")
            .attr("class", "brush")
            .attr("id", "boxbrush" + lastBrush)
            .call(brush);
        }
      }
    })
  }

  boxplot.data = function (_, boxBrush) {
    if (!arguments.length) {
      return data
    }
    data = _;
    if (boxBrush != null) {
      brushMode = boxBrush;
    }
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
