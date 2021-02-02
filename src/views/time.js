import * as d3 from 'd3'
import { create } from 'd3';

export default function () {
  let data = [];
  let bins = [];
  let dataRegions = {};

  let yTopic = "";

  let updateData, zoom, brushended;

  let lastBrush = 0;
  let brush = null;

  // brush callbacks
  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (views) => { console.log("brush completed ", views) }
  let brushMode = false;
  let views = ["boxplot"]; // other views

  let idleTimeout, idleDelay = 350;

  let margin = { top: 20, right: 30, bottom: 20, left: 50 };

  let width = 600 - margin.left - margin.right;
  let height = 270 - margin.top - margin.bottom;

  let x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

  let xAxis, yAxis;

  const time = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr("width", width + 2* (margin.left + margin.right))
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

      let createLegend = function (legend) {
        selectedRegions.forEach((region, index) => {
          legend.append("circle").attr("cx", width).attr("cy", (index + 1) * margin.top).attr("r", 6).style("fill", regionColor(region.id))
          legend.append("text").attr("x", width + margin.right / 4).attr("y", (index + 1) * margin.top + 4).text(region.name).style("font-size", "15px").attr("alignment-baseline", "middle")
        })
      }

      updateData = function () {
        // Handmade legend
        svg.select("#legend").remove();
        let legend = svg.append("g")
          .attr("class", "focus")
          .attr("id", "legend");
        createLegend(legend);

        x.domain(d3.extent(data, function (d) { return +d["date"]; }));
        y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
        console.log("time has %d elements. (brush mode: %s)\ndomain: %o", data.length, brushMode ? "on" : "off", x.domain());
        /** path */
        focus.selectAll("#boxes").remove();

        focus.selectAll("path")
          .transition()
          .duration(100)
          .ease(d3.easeBackOut)
          .remove();

        dataRegions = {};

        selectedRegions.forEach((region, index) => {
          let regionId = region.id
          console.log(regionId);
          let regionData = data.filter(d => { return d.region == regionId });
          dataRegions[regionId] = regionData;
          let line = d3.line()
            .defined((d, i) => {
              if (i != 0) {
                if (d.date.getDate() - regionData[i - 1].date.getDate() > 1) {
                  return false;
                }
                else return true;
              }
              else return false;
            })
          focus.append("path")
            .datum(regionData)
            .attr("id", "data--path--" + index)
            .attr("stroke", function (d) { return regionColor(region.id) })
            .attr("stroke-width", "2")
            .attr("clip-path", "url(#clip2)")
            .attr("d",
              line
                .x(function (d) { return x(d.date) })
                .y(function (d) {
                  return y(d[yTopic])
                })
            );

          focus.selectAll("#empty--path")
            .transition()
            .duration(100)
            .ease(d3.easeBackOut)
            .remove();
        });

        /** AXIS */
        xAxis = d3.axisBottom(x)
          .tickFormat(d => {
            return d.toLocaleDateString('en-US', { month: 'short' })
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

          brushended = function () {
            let s = d3.event.selection;
            if (!s) {
              //if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
              //x.domain(d3.extent(data, function (d) { return d["date"]; }));
              //brushMode = false;
              //y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
            } else {
              x.domain(s.map(x.invert, x));
              brushMode = true;
              brushTimeButton.disabled = false;
              //y.domain([s[0][1], s[1][1]].map(y.invert, y));
              focus.select(".brush").call(brush.move, null);
              // update date inputs
              start.value = x.domain()[0].toLocaleDateString("en-CA")
              finish.value = x.domain()[1].toLocaleDateString("en-CA")
              zoom();
              onBrushCompleted(brushMode ? views : null, true);
            }
          }

          zoom = function () {
            console.log("zoom");
            let transition = svg.transition().duration(750);
            svg.select("#axis--x").transition(transition).call(xAxis);
            svg.select("#axis2--x").transition(transition).call(xAxis2);
            svg.select("#axis--y").transition(transition).call(yAxis);

            focus.selectAll("path").each(function (pathData, index) {
              let line = d3.line()
                .defined((d, i) => {
                  if (i != 0) {
                    if (d.date.getDate() - pathData[i - 1].date.getDate() > 1) {
                      return false;
                    }
                    else return true;
                  }
                  else return false;
                });
              focus.select("#data--path--" + index).transition(transition)
                .attr("d", line
                  .x(function (d) {
                    let xValue = x(d.date);
                    onBrush(
                      brushMode, // brush mode
                      d, // value to update
                      xValue >= x.range()[0] && xValue <= x.range()[1], // brushed 
                      views, // views to update
                      "selectedTime"
                    );
                    return xValue;
                  })
                  .y(function (d) { return y(d[yTopic]) })
                )
            });

            focus.selectAll("#boxes").transition(transition)
              .attr("transform", function (d, i) { return "translate(" + x(bins[i].x0) + "," + y(d[yTopic]) + ")"; })
              .attr("width", function (d, i) { return x(bins[i].x1) - x(bins[i].x0) - 1; })
              .attr("height", function (d) { return height - y(d[yTopic]) })
              .attr("stroke", "black")
              .attr("stroke-width", ".5")
              .style("fill", "#69b3a2");
          }

          focus.append("text")
            .attr("transform", "rotate(-90)")
            .attr("id", "y-label")
            .attr("y", 0 - margin.left / 2)
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
        if (!brush) {
          brush = d3.brushX().extent([[0, 0], [width, height]]).on("end", brushended)
          lastBrush++;
          focus.append("g")
            .attr("class", "brush")
            .attr("id", "timebrush" + lastBrush)
            .call(brush);
        }
      }
    })
  }

  time.data = function (newData, boxBrush, timeBrush) {
    if (!arguments.length) {
      return data
    }
    if (typeof updateData === 'function') {
      brushMode = timeBrush;
      data = newData.filter(d => {
        if (d.selectedRegion) {
          if (boxBrush) {
            return d.selectedTime && d.selectedMobility;
          }
          else {
            return d.selectedTime;
          }
        }
        else {
          return false;
        }
      });
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
      data = newData.filter(d => { return brushMode ? d.selectedRegion && d.selectedTime && d.selectedMobility : d.selectedRegion && d.selectedTime });
      updateData()
    }
    return time
  }

  time.setBrushMode = function (mode) {
    brushMode = mode;
    return time
  }

  // bindings
  time.bindBrush = (callback) => onBrush = callback
  time.bindBrushComplete = (callback) => onBrushCompleted = callback

  return time;
}
