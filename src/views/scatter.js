import * as d3 from 'd3'
import * as regions from './../region'
import { functions } from '../util'

export default function () {
  let data = [];

  let regionData = regions.default
  let updateData, zoom, brushended, highlight;

  let width = 450, height = 230;
  let margin = { top: 15, right: 15, bottom: 15, left: 15 };

  let actualWidth = width - margin.left - margin.right;
  let actualHeight = height - margin.top - margin.bottom;

  let x = d3.scaleLinear().range([0, actualWidth]),
    y = d3.scaleLinear().range([actualHeight, 0]);


  let idleTimeout, idleDelay = 350;

  let zoomMode = false;

  let brush = null;

  // brush callbacks
  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (mode) => { console.log("brush completed ", mode) }
  let brushMode = false;
  let boxBrush = false;
  let timeBrush = false;
  let scatterBrush = false;
  let views = ["time", "boxplot"]; // other views


  let createRegionsLegend = function (legend) {
    let radius = 5;

    selectedRegions.forEach((region, index) => {
      legend.append("circle")
        .attr("cx", width - 0.09 * width)
        .attr("cy", (index + 1) * 3 * radius)
        .attr("r", radius)
        .style("fill", regionColor(region.id))
      legend.append("text")
        .attr("x", width - 0.08 * width)
        .attr("y", (index + 1) * 3 * radius + radius)
        .text(region.name)
        .style("font-size", "13px")
        .attr("alignment-baseline", "middle")
    })
  }
  let createLegend = function (legend) {
    let radius = 5;

    for (let i = 0; i < clusterNumber.value; i++) {
      legend.append("circle")
        .attr("cx", width - 0.09 * width)
        .attr("cy", (i + 1) * 3 * radius)
        .attr("r", radius)
        .style("fill", clusterColor(i))
      legend.append("text")
        .attr("x", width - 0.08 * width)
        .attr("y", (i + 1) * 3 * radius + radius)
        .text("Cluster " + (i + 1))
        .style("font-size", "13px")
        .attr("alignment-baseline", "middle")
    }
  }



  const scatter = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr('viewBox', '0 0 ' + width + ' ' + height);
      // .attr("width", width + 4 * (margin.left + margin.right))
      // .attr("height", height + margin.top);

      //svg.append("defs").append("clipPath")
      //  .attr("id", "clipScatter")
      //  .append("rect")
      //.attr("width", actualWidth/*width + 2 + (margin.left + margin.right)*/)
      //.attr("height", actualHeight/*height + margin.top*/);

      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



      updateData = function () {
        functions.logViewStatus("scatter", data.length, timeBrush, boxBrush, scatterBrush)
        // Handmade legend
        svg.select("#legend").remove();
        let legend = svg.append("g")
          .attr("class", "focus")
          .attr("id", "legend")
          .attr("transform", "translate(" + (10 + margin.left) + "," + (10 + margin.top) + ")");
        clusterNumber.value > 1 ? createLegend(legend) : createRegionsLegend(legend);
        // domains
        if (!zoomMode) {
          x.domain(d3.extent(data, function (d) { return d["Y1"]; })).nice();
          y.domain(d3.extent(data, function (d) { return d["Y2"]; })).nice();
        }

        let xAxis = d3.axisBottom(x).tickFormat(d => { return d != 0 ? d : "" }), yAxis = d3.axisLeft(y);
        // append scatter plot to main chart area
        focus.select("#axis--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis--x")
          .attr("transform", "translate(0," + y(0) + ")")
          .call(xAxis);
        focus.select("#axis--y").remove();
        focus.append("g")
          .attr('id', "axis--y")
          .attr("class", "axis axis--y")
          .attr("transform", "translate(" + x(0) + ", 0)")
          .call(yAxis);
        focus.select("#axis--x--text").remove();
        focus.append("text")
          //.attr("transform", "rotate(-90)")
          .attr("y", y.range()[1])
          .attr("x", x(0) + 10)
          .attr("dy", "1em")
          .attr("id", "axis--x--text")
          .style("text-anchor", "middle")
          .text("Y[2]");
        focus.select("#axis--y--text").remove();
        focus.append("text")
          .attr("transform",
            "translate(" + x.range()[1] + " ," +
            (y(0) - 3) + ")")
          .style("text-anchor", "middle")
          .attr("id", "axis--y--text")
          .text("Y[1]");

        let idled = function () {
          idleTimeout = null;
        }

        brushended = function () {
          let s = d3.event.selection;
          console.log("brushnede", s)
          if (!s) {
            //if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
            //x.domain(d3.extent(data, function (d) { return d["Y1"]; }));
            //y.domain(d3.extent(data, function (d) { return d["Y2"]; }));
            //brushMode = false;
          } else {
            scatterBrush = true;
            brushScatterButton.disabled = false;
            if (zoomMode) {
              x.domain([s[0][0], s[1][0]].map(x.invert, x));
              y.domain([s[1][1], s[0][1]].map(y.invert, y));
              focus.select(".scatterbrush").call(brush.move, null);
              zoom();

            }
            else {
              let newX = x.copy();
              let newY = y.copy();
              newX.domain([s[0][0], s[1][0]].map(newX.invert, newX));
              newY.domain([s[1][1], s[0][1]].map(newY.invert, newY));
              highlight(newX, newY);
            }
            onBrushCompleted(views);
          }
        }

        highlight = function (newX, newY) {
          console.log("highlight");

          svg.selectAll("#dots")
            .attr("cx", function (d) {
              let xValue = newX(d["Y1"]);
              let yValue = newY(d["Y2"]);
              onBrush(
                brushMode, // brush mode
                d, // value to update
                xValue >= x.range()[0] && xValue <= x.range()[1] && yValue <= y.range()[0] && yValue >= y.range()[1],
                views, // views to update
                "selectedScatter"
              );
              return x(d["Y1"]);
            })
            .attr("cy", function (d) { return y(d["Y2"]); })
            .attr("opacity", d => {
              let xValue = newX(d["Y1"]);
              let yValue = newY(d["Y2"]);
              return xValue >= x.range()[0] && xValue <= x.range()[1] && yValue <= y.range()[0] && yValue >= y.range()[1] ? "1" : ".2"
            });
        }

        zoom = function () {
          console.log("zoom");
          let transition = svg.transition().duration(750);
          svg.select("#axis--x")
            .transition(transition)
            .attr("transform", "translate(0," + y(0) + ")")
            .call(xAxis);
          svg.select("#axis--y")
            .transition(transition)
            .attr("transform", "translate(" + x(0) + ", 0)")
            .call(yAxis);

          focus.select("#axis--x--text")
            .transition(transition)
            .attr("transform",
              "translate(" + x.range()[0] + " ," +
              y.range()[1] + ")");

          focus.select("#axis--y--text")
            .transition(transition)
            .attr("transform",
              "translate(" + x.range()[1] + " ," +
              (y(0) - 3) + ")");

          svg.selectAll("#dots").transition(transition)
            .attr("cx", function (d) {
              let xValue = x(d["Y1"]);
              let yValue = y(d["Y2"]);
              onBrush(
                brushMode, // brush mode
                d, // value to update
                xValue >= x.range()[0] && xValue <= x.range()[1] && yValue <= y.range()[0] && yValue >= y.range()[1],
                views, // views to update
                "selectedScatter"
              );
              return xValue;
            })
            .attr("cy", function (d) { if (d.selectedRegion) return y(d["Y2"]); })
            .attr("opacity", d => {
              let xValue = x(d["Y1"]);
              let yValue = y(d["Y2"]);
              return xValue >= x.range()[0] && xValue <= x.range()[1] && yValue <= y.range()[0] && yValue >= y.range()[1] ? "1" : ".2"
            });
        }


        if (!scatterBrush) {
          focus.select(".scatterbrush").remove();
          brush = null;
        }
        if (!brush) {
          brush = d3.brush().extent([[0, 0], [width, height]]).on("end", brushended)
          focus.append("g")
            .attr("class", "scatterbrush")
            .call(brush);
        }

        focus.selectAll(".dot").remove();
        let dots = focus.selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr("id", "dots")
          .attr('class', 'dot')
          //.attr("clip-path", "url(#clipScatter)")
          .attr("r", 5)
          .style("fill", d => clusterNumber.value > 1 ? clusterColor(d.cluster) : regionColor(d.region))
          .attr("stroke", "black")
          .attr("stroke-width", "1")
          .attr("opacity", d => {
            if (d.cluster!=null) {
              return functions.isDrawable(d, timeBrush, boxBrush, scatterBrush) ? "1" : ".2"
            }
            else{
              return "0"
            }
          })
          .attr("cx", function (d) { return x(d["Y1"]) })
          .attr("cy", function (d) { return y(d["Y2"]) });


        dots
          .transition()
          .duration(1000)
          .ease(d3.easeBackIn);

        const div = d3.select("body")
          .append("div")
          .attr("class", "tooltip")
          .style("opacity", 0);

        dots.on("mouseover", function (d) {
          if (this.getAttribute("opacity") == "1") {
            div.transition()
              .duration(200)
              .style("opacity", "1");
            div.html("<p><strong>Date:</strong> " + d.date.toLocaleDateString("en-CA") + " (" + d.date.toLocaleString('en-us', { weekday: 'short' }) + ")"
              + "</p><p><strong>Region:</strong> " + regionData[d.region].name + "</p>"
              + "<p><strong>" + selectedTimeType + ":</strong> " + d[selectedTimeType] + " cases</p>"
              + "<p><strong>" + selectedMobility + ":</strong> " + d[selectedMobility] + "%</p>")
              .style("background", regionColor(d.region))
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY) + "px");
          }
        })
          .on("mouseout", function (d) {
            if (this.getAttribute("opacity") == "1") {
              div.transition()
                .duration(500)
                .style("opacity", 0);
            }
          });
      }
    })
  }

  scatter.data = function (newData, boxBrushed, timeBrushed, scatterBrushed, filter) {
    if (!arguments.length) {
      return data;
    }
    data = newData
    if (typeof updateData === 'function') {
      boxBrush = boxBrushed;
      timeBrush = timeBrushed
      scatterBrush = scatterBrushed
      data = data.filter(d => { return filter ? window.app.canSelectData(d) : d.selectedRegion });
      updateData()
    }
    return scatter
  }

  scatter.setBrushMode = function (mode) {
    brushMode = mode;
    return scatter
  }

  scatter.setZoomMode = function (mode) {
    zoomMode = mode;
    return scatter
  }

  // bindings
  scatter.bindBrush = (callback) => onBrush = callback
  scatter.bindBrushComplete = (callback) => onBrushCompleted = callback

  return scatter;
}
