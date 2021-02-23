import * as d3 from 'd3'
import { functions } from '../util'

export default function () {
  let data = [];
  let bins = [];
  let dataRegions = {};

  let yTopic = "";

  let updateData, zoom, brushended, highlight;

  let focusCircle, focusText;

  let lastBrush = 0;
  let brush = null;

  let selectedLine = d3.line()
    .defined(d => {
      return functions.isDrawable(d, timeBrush, boxBrush, scatterBrush)
    })

  let unselectedLine = d3.line()
    .defined(d => {
      return !functions.isDrawable(d, timeBrush, boxBrush, scatterBrush)
    })

  // brush callbacks
  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (views) => { console.log("brush completed ", views) }
  let brushMode = false;
  let boxBrush = false;
  let timeBrush = false;
  let scatterBrush = false;
  let zoomMode = false;
  let views = ["boxplot", "scatter", "map"]; // other views

  let idleTimeout, idleDelay = 350;

  let margin = { top: 20, right: 30, bottom: 20, left: 50 };

  let width = 800 - margin.left - margin.right;
  let height = 300 - margin.top - margin.bottom;

  let x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

  let xAxis, yAxis;

  let daySelected = [];

  const time = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr("width", width + 4 * (margin.left + margin.right))
        .attr("height", height + margin.top + margin.bottom);

      svg.append("defs").append("clipPath")
        .attr("id", "clip2")
        .append("rect")
        .attr("width", width)
        .attr("height", height);


      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let idled = function () {
        idleTimeout = null;
      }

      // This allows to find the closest X index of the mouse:
      let bisect = d3.bisector(function (d) { return d.date }).left;


      let mouseover = function () {
        focus.selectAll(".timepath").each(function (_, index) {
          focus.select("#focusCircle" + index).style("opacity", 1)
          svg.select("#focusText" + index).style("opacity", 1)
        })
      }

      let mousemove = function () {

        focus.selectAll(".timepath").each(function (pathData, index) {
          if (pathData) {
            // recover coordinate we need
            let x0 = x.invert(d3.mouse(this)[0]);
            let i = bisect(pathData, x0, 1);
            let selectedData = pathData[i]
            //console.log(selectedData, index);
            focus.select("#focusCircle" + index)
              .attr("cx", x(selectedData["date"]))
              .attr("cy", y(selectedData[yTopic]))
            svg.select("#focusText" + index)
              .html("date:" + selectedData["date"].toLocaleDateString("en-CA") + "  -  " + "" + yTopic + ": " + selectedData[yTopic])
              .attr("x", x(selectedData["date"]) + 15)
              .attr("y", y(selectedData[yTopic]) + 20)
          }
        })
      }

      let mouseout = function () {
        console.log("mouseout")
        focus.selectAll(".timepath").each(function (_, index) {
          focus.select("#focusCircle" + index).style("opacity", 0)
          svg.select("#focusText" + index).style("opacity", 0)
        })
      }

      let createLegend = function (legend) {
        selectedRegions.forEach((region, index) => {
          legend.append("circle").attr("cx", width + 2.2 * margin.right).attr("cy", (index + 1) * margin.top).attr("r", 6).style("fill", regionColor(region.id))
          legend.append("text").attr("x", width + 2.8 * margin.right).attr("y", (index + 1) * margin.top + 4.5).text(region.name).style("font-size", "13px").attr("alignment-baseline", "middle")
        })
        legend.append("line").attr("x1", width + 2 * margin.right).attr("y1", (selectedRegions.length + 1) * margin.top + 4.5).attr("x2", width + 2.5 * margin.right).attr("y2", (selectedRegions.length + 1) * margin.top + 4.5).style("stroke", "black")
        legend.append("line").attr("x1", width + 2 * margin.right).attr("y1", (selectedRegions.length + 0.7) * margin.top + 4.5).attr("x2", width + 2 * margin.right).attr("y2", (selectedRegions.length + 1.3) * margin.top + 4.5).style("stroke", "black")
        legend.append("line").attr("x1", width + 2.5 * margin.right).attr("y1", (selectedRegions.length + 0.7) * margin.top + 4.5).attr("x2", width + 2.5 * margin.right).attr("y2", (selectedRegions.length + 1.3) * margin.top + 4.5).style("stroke", "black")
        legend.append("text").attr("x", width + 2.8 * margin.right).attr("y", (selectedRegions.length + 1.2) * margin.top + 4.5).text("1 week").style("font-size", "13px").attr("alignment-baseline", "middle")
      }

      updateData = function () {
        // Handmade legend
        svg.select("#legend").remove();
        let legend = svg.append("g")
          .attr("class", "focus")
          .attr("id", "legend");
        createLegend(legend);

        if (!zoomMode) {
          x.domain(d3.extent(data, function (d) { return +d["date"]; }));
          y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
        }
        functions.logViewStatus("time series", data.length, timeBrush, boxBrush, scatterBrush)
        /** path */

        focus.selectAll("path")
          .transition()
          .duration(500)
          .ease(d3.easeBackOut)
          .remove();

        brushended = function () {
          let s = d3.event.selection;
          if (!s) {
            //if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
            //x.domain(d3.extent(data, function (d) { return d["date"]; }));
            //brushMode = false;
            //y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
          } else {
            //brushMode = true;
            boxBrush = false;
            timeBrush = true;
            brushTimeButton.disabled = false;
            if (!zoomMode) {
              let newX = x.copy()
              newX.domain(s.map(x.invert, x));
              start.value = newX.domain()[0].toLocaleDateString("en-CA")
              finish.value = newX.domain()[1].toLocaleDateString("en-CA")
              highlight(newX);
            }
            else {
              x.domain(s.map(x.invert, x));
              //y.domain([s[0][1], s[1][1]].map(y.invert, y));
              start.value = x.domain()[0].toLocaleDateString("en-CA")
              finish.value = x.domain()[1].toLocaleDateString("en-CA")
              focus.select(".timebrush").call(brush.move, null);
              // update date inputs
              zoom();
            }

            onBrushCompleted(views, true);
          }
        }

        highlight = function (newX) {
          console.log("highlight");

          focus.selectAll(".timepath").each(function (pathData, index) {
            if (pathData) {
              pathData.forEach(d => {
                let xValue = newX(d.date);
                d.selectedTime = xValue >= newX.range()[0] && xValue <= newX.range()[1] && daySelected.includes(d.date.getDay()) // brushed
                onBrush(
                  brushMode, // brush mode
                  d, // value to update
                  d.selectedTime,//xValue >= newX.range()[0] && xValue <= newX.range()[1], // brushed 
                  views, // views to update
                  "selectedTime"
                );
              })

              focus.select("#data--path--" + index)
                .attr("d", selectedLine
                  .x(function (d) { return x(d.date); })
                  .y(function (d) { return y(d[yTopic]) })
                )
            }
          });

          focus.selectAll(".unselectedtimepath").each(function (pathData, index) {
            if (pathData) {
              pathData.forEach(d => {
                let xValue = newX(d.date);
                d.selectedTime = xValue >= newX.range()[0] && xValue <= newX.range()[1] && daySelected.includes(d.date.getDay())// brushed
              })

              focus.select("#unselected-path-" + index)
                .attr("d", unselectedLine
                  .x(function (d) { return x(d.date); })
                  .y(function (d) { return y(d[yTopic]) })
                )
            }
          });
        }

        zoom = function () {
          console.log("zoom");
          let transition = svg.transition().duration(750);
          svg.select("#axis--x").transition(transition).call(xAxis);
          svg.select("#axis2--x").transition(transition).call(xAxis2);
          svg.select("#axis--y").transition(transition).call(yAxis);

          focus.selectAll(".timepath").each(function (pathData, index) {
            pathData.forEach(d => {
              let xValue = x(d.date);
              d.selectedTime = xValue >= x.range()[0] && xValue <= x.range()[1] && daySelected.includes(d.date.getDay()) // brushed
              onBrush(
                brushMode, // brush mode
                d, // value to update
                d.selectedTime,//xValue >= newX.range()[0] && xValue <= newX.range()[1], // brushed 
                views, // views to update
                "selectedTime"
              );
            })
            focus.select("#data--path--" + index).transition(transition)
              .attr("d", selectedLine
                .x(function (d) { return x(d.date); })
                .y(function (d) { return y(d[yTopic]) })
              )
          });

          focus.selectAll(".unselectedtimepath").each(function (pathData, index) {
            if (pathData) {
              pathData.forEach(d => {
                let xValue = x(d.date);
                d.selectedTime = xValue >= x.range()[0] && xValue <= x.range()[1] && daySelected.includes(d.date.getDay())// brushed
              })

              focus.select("#unselected-path-" + index).transition(transition)
                .attr("d", unselectedLine
                  .x(function (d) { return x(d.date); })
                  .y(function (d) { return y(d[yTopic]) })
                )
            }
          });
        }

        if (!timeBrush) {
          focus.select(".timebrush").remove();
          brush = null;
        }
        if (!brush) {
          brush = d3.brushX().extent([[0, 0], [width, height]]).on("end", brushended)
          lastBrush++;
          focus.append("g")
            .attr("class", "timebrush")
            .attr("id", "timebrush" + lastBrush)
            //.on('mouseover', mouseover)
            //.on('mousemove', mousemove)
            //.on('mouseout', mouseout)
            .call(brush);
        }

        dataRegions = {};

        selectedRegions.forEach((region, index) => {
          let regionId = region.id

          let regionData = data.filter(d => { return d.region == regionId });
          dataRegions[regionId] = regionData;

          focus.append("path")
            .datum(regionData)
            .attr("id", "data--path--" + index)
            .attr("stroke", function (d) { return regionColor(region.id) })
            .attr("stroke-width", "2.5")
            .attr("class", "timepath")
            .attr("clip-path", "url(#clip2)")
            .attr("d",
              selectedLine
                .x(function (d) { return x(d.date) })
                .y(function (d) { return y(d[yTopic]) })

            );

          focus.append("path")
            .datum(regionData)
            .attr("id", "unselected-path-" + index)
            .attr("stroke", function (d) { return regionColor(region.id) })
            .attr("stroke-width", "2")
            .attr("class", "unselectedtimepath")
            .attr("clip-path", "url(#clip2)")
            .attr("opacity", ".5")
            .attr("d",
              unselectedLine
                .x(function (d) { return x(d.date) })
                .y(function (d) { return y(d[yTopic]) })
            );

          // Create the circle that travels along the curve of chart
          focus
            .append('g')
            .append('circle')
            .style("fill", "none")
            .attr("stroke", regionColor(region.id))
            .attr("stroke-width", "2")
            .attr('r', 6)
            .attr("id", "focusCircle" + index)
            .style("opacity", 0)

          // Create the text that travels along the curve of chart
          svg
            .append('text')
            .style("opacity", 0)
            .attr("dy", "2em")
            .attr("text-anchor", "left")
            .attr("alignment-baseline", "middle")
            .attr("id", "focusText" + index)
        });

        /** AXIS */
        xAxis = d3.axisBottom(x)
          .tickFormat(d => {
            return d.toLocaleDateString('en-US', { month: 'short' }) + " " + d.getDate()
          })
          .ticks(d3.timeWeek.every(5))

        let xAxis2 = d3.axisBottom(x)
          .tickFormat(d => {
            //return d.toLocaleDateString('en-US', { month: 'short' })+" "+d.getDate()
          })
          .ticks(d3.timeWeek.every(1))

        yAxis = d3.axisLeft(y);

        focus
          .attr("transform", `translate(${margin.left},0)`)
          .call(d3.axisRight(y)
            .tickSize(width))
          .call(g => g.select(".domain")
            .remove())
          .call(g => g.selectAll(".tick:not(:first-of-type) line")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-dasharray", "2,2"))
          .call(g => g.selectAll(".tick text")
            .attr("hidden", true))



        focus.selectAll("#axis--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis--x")
          .attr("stroke-width", "2")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

        focus.selectAll("#axis2--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis2--x")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis2);

        focus.selectAll("#axis--y").remove();
        focus.append("g")
          .attr('id', "axis--y")
          .attr("class", "axis axis--y")
          .call(yAxis);

        if (focus.select("#y-label").empty()) {

          svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("id", "y-label")
            .attr("y", 0)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("people");

          svg.append("text")
            .attr("transform",
              "translate(" + ((width + margin.right + margin.left) / 2) + " ," +
              (height + 1.5 * margin.bottom) + ")")
            .style("text-anchor", "middle")
            .text("time");
        }
      }
    })
  }

  time.data = function (newData, newBoxBrush, newTimeBrush, newScatterBrush, newDaySelected) {
    if (!arguments.length) {
      return data
    }
    if (typeof updateData === 'function') {

      //brushMode = timeBrush;
      boxBrush = newBoxBrush;
      timeBrush = newTimeBrush;
      scatterBrush = newScatterBrush;
      if (newDaySelected) {
        daySelected = newDaySelected;
      }
      data = newData.filter(d => {
        if (d.selectedRegion) {
          return zoomMode ? x(d.date) >= x.range()[0] && x(d.date) <= x.range()[1] : true;
        }
        else {
          return false;
        }
      });
      zoomMode = zoomTime.checked;
      updateData()
    }
    return time
  }

  time.updateY = function (newY, newData) {
    if (!arguments.length) {
      return data
    }
    yTopic = newY
    if (typeof updateData === 'function') {
      brushMode = false;
      y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
      updateData()
    }
    return time
  }

  time.setBrushMode = function (mode) {
    brushMode = mode;
    return time
  }

  time.setZoomMode = function (mode) {
    zoomMode = mode;
    return time
  }

  // bindings
  time.bindBrush = (callback) => onBrush = callback
  time.bindBrushComplete = (callback) => onBrushCompleted = callback

  return time;
}
