import * as d3 from 'd3'

export default function () {
  let data = [];

  let yTopic = "";

  let updateData;

  // rectangle for the main box
  let boxWidth = 100

  let margin = { top: 20, right: 30, bottom: 100, left: 100 };

  let width = 600 - margin.left - margin.right;
  let height = 370 - margin.top - margin.bottom;

  let x = d3.scaleBand().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

  let xAxis, yAxis;

  const boxplot = function (selection) {
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

      updateData = function () {
        let filteredData = data.filter(d => { return d.selected });

        console.log("updateData", filteredData.length);
        // Compute quartiles, median, inter quantile range min and max --> these info are then used to draw the box.
        const sumstat = d3.nest() // nest function allows to group the calculation per level of a factor
          .key(function () { return yTopic; })
          .rollup(function (d) {
            let q1 = d3.quantile(d.map(function (g) { return +g[yTopic]; }).sort(d3.ascending), .25)
            let median = d3.quantile(d.map(function (g) { return +g[yTopic]; }).sort(d3.ascending), .5)
            let q3 = d3.quantile(d.map(function (g) { return +g[yTopic]; }).sort(d3.ascending), .75)
            let interQuantileRange = q3 - q1
            let min = q1 - 1.5 * interQuantileRange
            let max = q3 + 1.5 * interQuantileRange
            return ({ q1: q1, median: median, q3: q3, interQuantileRange: interQuantileRange, min: min, max: max })
          })
          .entries(filteredData)

        x.domain([yTopic])
          .paddingInner(1)
          .paddingOuter(.5);
        y.domain(d3.extent(filteredData, function (d) { return +d[yTopic]; }));
        /** boxplot */


        // Show the main vertical line
        focus.select("#vert-lines").remove();
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

        focus.select("#vert--lines").lower();

        // show the main boxes
        focus.select("#boxes").remove();

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
        focus.select("#median-lines").remove();
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

        const points = focus
          .selectAll("circle")
          .data(filteredData);

        points.enter()
          .append("circle")
          .merge(points)
          .attr("id", "data-points")
          .attr("cx", function () { return (x(yTopic) - jitterWidth / 2 + Math.random() * jitterWidth) })
          .attr("cy", function (d) { return (y(d[yTopic])) })
          .attr("r", 4)
          .style("fill", "white")
          .attr("stroke", "black")


        /** AXIS */
        xAxis = d3.axisBottom(x);
        yAxis = d3.axisLeft(y);

        focus.select("g.axis--x").remove();
        focus.append("g")
          .attr("class", "axis axis--x")
          .attr('id', "axis--x")
          .attr("transform", "translate(0," + height + ")")
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

      }
    })
  }

  boxplot.data = function (_) {
    if (!arguments.length) {
      return data
    }
    data = _
    if (typeof updateData === 'function') {
      updateData()
    }
    return boxplot
  }

  boxplot.updateY = function (_) {
    if (!arguments.length) {
      return data
    }
    yTopic = _
    if (typeof updateData === 'function') {
      updateData()
    }
    return boxplot
  }

  return boxplot;
}
