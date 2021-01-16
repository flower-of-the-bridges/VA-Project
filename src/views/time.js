import * as d3 from 'd3'

export default function () {
  let data = [];

  let yTopic = "";

  let updateData, zoom, brushended;

  let margin = { top: 20, right: 30, bottom: 100, left: 100 };

  let width = 600 - margin.left - margin.right;
  let height = 370 - margin.top - margin.bottom;

  let x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height, 0]);

  let xAxis, yAxis;

  const time = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      brushended = function (s) {
        console.log("brushnede time", s)
        if (!s) {
          //if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
          x.domain(d3.extent(data, function (d) { if (d.selected) return d["date"]; })).nice();
          //y.domain(d3.extent(data, function (d) { if (d.selected) return +d["new"]; }));
        } else {
          x.domain([s[0][0], s[1][0]].map(x.invert, x));
          //y.domain([s[1][1], s[0][1]].map(y.invert, y));
        }
        zoom();
      }

      zoom = function () {
        console.log("zoom");
        let transition = svg.transition().duration(750);
        svg.select("#axis--x").transition(transition).call(xAxis);
        svg.select("#axis--y").transition(transition).call(yAxis);
        focus.select("#data--path").transition(transition)
          .attr("d", d3.line()
            .curve(d3.curveBasis)
            .x(function (d) { return x(d.date) })
            .y(function (d) { return y(d[yTopic]) })
          )
      }

      updateData = function () {
        let filteredData = data.filter(d => { return d.selected });

        x.domain(d3.extent(filteredData, function (d) { return d["date"]; })).nice();
        y.domain(d3.extent(filteredData, function (d) { return +d[yTopic]; }));
        /** path */

        focus.select("#data--path")
          .transition()
          .duration(100)
          .ease(d3.easeBackOut)
          .remove();

        focus.append("path")
          .datum(filteredData)
          .attr("id", "data--path")
          .attr("stroke", "steelblue")
          .attr("d", d3.line()
            .curve(d3.curveBasis)
            .x(function (d) { return x(d.date) })
            .y(function (d) {
              return y(d[yTopic])
            })
          );

        /** AXIS */
        xAxis = d3.axisBottom(x)
          .tickFormat(d => {
            return d.toLocaleDateString('en-US', { month: 'short' })
          })
          .ticks(d3.timeWeek.every(4))

        let xAxis2 = d3.axisBottom(x)
          .tickFormat(d => {
            return ""
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

        focus.select("g.axis--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis--x")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

        focus.select("g.axis2--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis2--x")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis2);

        focus.select("g.axis--y").remove();
        focus.append("g")
          .attr('id', "axis--y")
          .attr("class", "axis axis--y")
          .call(yAxis);

        if (focus.select("#y-label").empty()) {
          focus.append("text")
            .attr("transform", "rotate(-90)")
            .attr("id", "y-label")
            .attr("y", 0 - margin.left/2)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("people");

          svg.append("text")
            .attr("transform",
              "translate(" + ((width + margin.right + margin.left) / 2) + " ," +
              (height + margin.bottom - 3*margin.top) + ")")
            .style("text-anchor", "middle")
            .text("time");
        }
      }
    })
  }

  time.data = function (_) {
    if (!arguments.length) {
      return data
    }
    data = _
    if (typeof updateData === 'function') {
      updateData()
    }
    return time
  }

  time.updateY = function (_) {
    if (!arguments.length) {
      return data
    }
    yTopic = _
    if (typeof updateData === 'function') {
      updateData()
    }
    return time
  }

  time.brush = function (s) {
    if (typeof brushended === 'function') {
      brushended(s)
    }
    return time
  }
  return time;
}
