import * as d3 from 'd3'

export default function () {
  let data = [];


  let updateData, zoom, brushended;

  let margin = { top: 20, right: 20, bottom: 30, left: 30 };

  let width = 500 - margin.left - margin.right;
  let height = 280 - margin.top - margin.bottom;

  let x = d3.scaleLinear().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

  let color = d3.scaleOrdinal(d3.schemeCategory10);

  let idleTimeout, idleDelay = 350;

  const scatter = function (selection) {
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
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

      updateData = function () {
        // remove previous elements ( if any)

        x.domain(d3.extent(data, function (d) { return +d["Y1"];/*return +d[chiavi[0]];*/ })).nice();
        y.domain(d3.extent(data, function (d) { return +d["Y2"];/*return +d[chiavi[1]];*/ })).nice();


        let xAxis = d3.axisBottom(x), yAxis = d3.axisLeft(y);
        // append scatter plot to main chart area 

        //let dots = focus.append("g");
        //dots.attr("clip-path", "url(#clip)");

        let dots = focus.selectAll("circle")
          .data(data);

        dots.enter()
          .append("circle")
          .attr('class', 'dot')
          .attr("clip-path", "url(#clip)")
          .attr("r", 5)
          .merge(dots)
          .transition()
          .duration(1000)
          .ease(d3.easeBackIn)
          .attr("stroke", d => !d.selected ? "grey" : "black")
          .attr("stroke-width", ".5")
          .attr("opacity", d => d.selected ? ".9" : ".1")
          .attr("cx", function (d) { if (d.selected) return x(d["Y1"])/**return x(+d[chiavi[0]]);*/ })
          .attr("cy", function (d) { if (d.selected) return y(d["Y2"])/**return y(+d[chiavi[1]]);*/ })
          .style("fill", d => d.selected ? color(d.region) : "transparent");

        if (svg.select("#axis--x").empty()) {
          console.log("creating axis")
          focus.append("g")
            .attr("class", "axis axis--x")
            .attr('id', "axis--x")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

          focus.append("g")
            .attr('id', "axis--y")
            .attr("class", "axis axis--y")
            .call(yAxis);

          focus.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Y[2]"/**chiavi[1]*/);

          svg.append("text")
            .attr("transform",
              "translate(" + ((width + margin.right + margin.left) / 2) + " ," +
              (height + margin.top + margin.bottom) + ")")
            .style("text-anchor", "middle")
            .text("Y[1]"/**chiavi[0]*/);

          let idled = function () {
            idleTimeout = null;
          }

          brushended = function () {
            let s = d3.event.selection;
            console.log("brushnede", s)
            if (!s) {
              if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
              x.domain(d3.extent(data, function (d) { return +d["Y1"]; })).nice();
              y.domain(d3.extent(data, function (d) { return +d["Y2"]; })).nice();
            } else {

              x.domain([s[0][0], s[1][0]].map(x.invert, x));
              y.domain([s[1][1], s[0][1]].map(y.invert, y));
              focus.select(".brush").call(brush.move, null);
            }
            zoom();
          }

          zoom = function () {
            console.log("zoom");
            let transition = svg.transition().duration(750);
            svg.select("#axis--x").transition(transition).call(xAxis);
            svg.select("#axis--y").transition(transition).call(yAxis);
            svg.selectAll("circle").transition(transition)
              .attr("cx", function (d) { if (d.selected) return x(d["Y1"]); })
              .attr("cy", function (d) { if (d.selected) return y(d["Y2"]); });
          }

          const brush = d3.brush().extent([[0, 0], [width, height]]).on("end", brushended)

          focus.append("g")
            .attr("class", "brush")
            .call(brush);
        }


      }

    })
  }

  scatter.data = function (_) {
    if (!arguments.length) {
      return data
    }
    data = _
    if (typeof updateData === 'function') {
      updateData()
    }
    return scatter
  }
  return scatter;
}
