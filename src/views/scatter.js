import * as d3 from 'd3'

export default function () {
  let data = [],
    width = 400,
    height = 400

  let updateData;

  let margin = { top: 20, right: 20, bottom: 110, left: 50 },
    margin2 = { top: 430, right: 20, bottom: 30, left: 40 },
    height2 = 500 - margin2.top - margin2.bottom;

  let x = d3.scaleLinear().range([0, width]),
    x2 = d3.scaleLinear().range([0, width]),
    y = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height2, 0]);



  let brush = d3.brushX()
    .extent([[0, 0], [width, height2]])
    .on("brush", () => { console.log("brush")});

  var brushTot = d3.brush()
    .extent([[0, 0], [width, height]])
    .on("end", () => { });

  let color = d3.scaleOrdinal(d3.schemeCategory10);

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
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      const context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");



      updateData = function () {
        x.domain(d3.extent(data, function (d) { return +d["Y1"];/*return +d[chiavi[0]];*/ }));
        y.domain(d3.extent(data, function (d) { return +d["Y2"];/*return +d[chiavi[1]];*/ }));
        x2.domain(x.domain());
        y2.domain(y.domain());

        let xAxis = d3.axisBottom(x),
          xAxis2 = d3.axisBottom(x2),
          yAxis = d3.axisLeft(y);
        // append scatter plot to main chart area 
        let dots = focus.append("g");
        dots.attr("clip-path", "url(#clip)");
        dots.selectAll("dot")
          .data(data)
          .enter().append("circle")
          .attr('class', 'dot')
          .attr("r", 5)
          .attr("fill", "grey")
          .attr("opacity", ".3")
          .attr("cx", function (d) { return x(d["Y1"])/**return x(+d[chiavi[0]]);*/ })
          .attr("cy", function (d) { return y(d["Y2"])/**return y(+d[chiavi[1]]);*/ })
          .style("fill", function (d) { return color(d.id) });


        focus.append("g")
          .attr("class", "axis axis--x")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis);

        focus.append("g")
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

        focus.append("g")
          .attr("class", "brushT")
          .call(brushTot);

        // append scatter plot to brush chart area      
        dots = context.append("g");
        dots.attr("clip-path", "url(#clip)");
        dots.selectAll("dot")
          .data(data)
          .enter().append("circle")
          .attr('class', 'dotContext')
          .attr("r", 3)
          .style("opacity", .5)
          .attr("cx", function (d) { return x2(d["Y1"])/**return x2(d[chiavi[0]]);*/ })
          .attr("cy", function (d) { return y2(d["Y2"])/**return y2(d[chiavi[1]]);*/ })
          .style("fill", function (d) { return color(d["id"]) });

        context.append("g")
          .attr("class", "axis axis--x")
          .attr("transform", "translate(0," + height2 + ")")
          .call(xAxis2);

        context.append("g")
          .attr("class", "brush")
          .call(brush)
          .call(brush.move, x.range());
      }
      console.log("finish")
    })
  }

  scatter.data = function (_) {
    console.log(typeof updateData);
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
