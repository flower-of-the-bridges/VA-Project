import * as d3 from 'd3'

export default function () {
  let data = [];


  let updateData, zoom, brushended;

  let margin = { top: 20, right: 30, bottom: 30, left: 50 };

  let width = 600;
  let height = 250;

  let x = d3.scaleLinear().range([0, width]),
    y = d3.scaleLinear().range([height - margin.top - margin.bottom, 0]);


  let idleTimeout, idleDelay = 350;

  // brush callbacks
  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (mode) => { console.log("brush completed ", mode) }
  let brushMode = false;
  let timeBrush = false;
  let views = ["time", "boxplot"]; // other views

  let clusterColors = d3.scaleOrdinal(d3.schemeCategory10);

  const scatter = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");



      updateData = function () {
        x.domain(d3.extent(data, function (d) { return d["Y1"]; })).nice();
        y.domain(d3.extent(data, function (d) { return d["Y2"]; })).nice();

        selectedRecords.textContent = data.filter(d => { return brushMode ? d.selectedMobility : true }).length;

        let xAxis = d3.axisBottom(x), yAxis = d3.axisLeft(y);
        // append scatter plot to main chart area
        if (svg.select("#axis--x").empty()) {
          focus.append("g")
            .attr("class", "axis axis--x")
            .attr('id', "axis--x")
            .attr("transform", "translate(0," + y(0) + ")")
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
              x.domain(d3.extent(data, function (d) { return d["Y1"]; }));
              y.domain(d3.extent(data, function (d) { return d["Y2"]; }));
              brushMode = false;
            } else {
              x.domain([s[0][0], s[1][0]].map(x.invert, x));
              y.domain([s[1][1], s[0][1]].map(y.invert, y));
              focus.select(".brush").call(brush.move, null);
              brushMode = true;
            }

            zoom();
            //onBrushCompleted(brushMode ? views : null);
          }

          zoom = function () {
            console.log("zoom");
            let transition = svg.transition().duration(750);
            svg.select("#axis--x")
              .transition(transition)
              .attr("transform", "translate(0," + y(0) + ")")
              .call(xAxis);
            svg.select("#axis--y").transition(transition).call(yAxis);
            svg.selectAll("circle").transition(transition)
              .attr("cx", function (d) {
                let xValue = x(d["Y1"]);
                let yValue = y(d["Y2"]);
                //onBrush(
                //  brushMode, // brush mode
                //  d, // value to update
                //  xValue >= x.range()[0] && xValue <= x.range()[1] && yValue <= y.range()[0] && yValue >= y.range()[1],
                //  views // views to update
                //);
                return xValue;
              })
              .attr("cy", function (d) { if (d.selectedRegion) return y(d["Y2"]); });
          }

          const brush = d3.brush().extent([[0, 0], [width, height]]).on("end", brushended)

          focus.append("g")
            .attr("class", "brush")
            .call(brush);
        }
        focus.selectAll("#dots").remove();
        let dots = focus.selectAll("circle")
          .data(data)
          .enter()
          .append("circle")
          .attr("id", "dots")
          .attr('class', 'dot')
          .attr("clip-path", "url(#clip)")
          .attr("r", 5)
          .style("fill", d => clusterColors(d.cluster))
          .attr("stroke", "black")
          .attr("stroke-width", "1")
          .attr("opacity", d => {
            let opacity = "1"
            if (timeBrush || brushMode) {
              if (timeBrush && brushMode) {
                opacity = d.selectedTime && d.selectedMobility ? "1" : ".2"
              }
              else if (brushMode) {
                opacity = d.selectedMobility ? "1" : ".2"
              }
              else if (timeBrush) {
                opacity = d.selectedTime ? "1" : ".2"
              }
            }
            return opacity
          })
          .attr("cx", function (d) { return x(d["Y1"]) })
          .attr("cy", function (d) { return y(d["Y2"]) });

        dots
          .transition()
          .duration(1000)
          .ease(d3.easeBackIn);

        const div = d3.select("body").append("div")
          .attr("class", "tooltip")
          .style("opacity", 0);

        dots.on("mouseover", function (d) {
          div.transition()
            .duration(200)
            .style("opacity", 1);
          div.html(d.id)
            .style("left", (d3.event.pageX) + "px")
            .style("top", (d3.event.pageY - 28) + "px");
        })
          .on("mouseout", function (d) {
            div.transition()
              .duration(500)
              .style("opacity", 0);
          });
      }
    })
  }

  scatter.data = function (newData, boxBrush, timeBrushed) {
    if (!arguments.length) {
      return data;
    }
    data = newData
    if (typeof updateData === 'function') {
      brushMode = boxBrush;
      timeBrush = timeBrushed
      data = data.filter(d => { return d.selectedRegion });
      console.log("scatter receives %d elements", data.length);
      updateData()
    }
    return scatter
  }

  scatter.setBrushMode = function (mode) {
    brushMode = mode;
    return scatter
  }

  // bindings
  scatter.bindBrush = (callback) => onBrush = callback
  scatter.bindBrushComplete = (callback) => onBrushCompleted = callback

  return scatter;
}
