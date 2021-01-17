import * as d3 from 'd3'

export default function () {
  let data = [];
  let bins = [];

  let yTopic = "";

  let updateData, zoom, brushended;

  // brush callbacks
  let onBrush = (mode, d, brush) => { console.log("brush mode %o for object %o and brush %o ", mode, d, brush) } // default callback when data is brushed
  let onBrushCompleted = (views) => { console.log("brush completed ", views) }
  let brushMode = false;
  let views = ["scatter", "boxplot"]; // other views

  let idleTimeout, idleDelay = 350;

  let margin = { top: 20, right: 30, bottom: 100, left: 100 };

  let width = 1000 - margin.left - margin.right;
  let height = 470 - margin.top - margin.bottom;

  let x = d3.scaleTime().range([0, width]),
    y = d3.scaleLinear().range([height, 0]);

  let xAxis, yAxis;

  const time = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

      svg.append("defs").append("clipPath")
        .attr("id", "clip2")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      svg.append("defs").append("clipPath")
        .attr("id", "clip3")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      const focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

      let idled = function () {
        idleTimeout = null;
      }

      updateData = function () {

        x.domain(d3.extent(data, function (d) { return d["date"]; }));
        y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
        /** path */
        // set the parameters for the histogram
        var histogram = d3.histogram()
          .domain(x.domain())  // then the domain of the graphic
          .thresholds(x.ticks(d3.timeDay.every(1))); // then the numbers of bins

        // And apply this function to data to get the bins
        bins = histogram(data);

        focus.selectAll("#boxes").remove();
        let boxes = focus
          .selectAll("boxes")
          .data(data)
        boxes
          .enter()
          .append("rect")
          .attr("id", "boxes")
          .attr("clip-path", "url(#clip3)")
          .merge(boxes)
          .transition()
          .duration(1000)
          .ease(d3.easeBackIn)
          .attr("x", 1)
          .attr("transform", function (d, i) { return "translate(" + x(bins[i].x0) + "," + y(d[yTopic]) + ")"; })
          .attr("width", function (d, i) { return x(bins[i].x1) - x(bins[i].x0) - 1; })
          .attr("height", function (d) { return height - y(d[yTopic]) })
          .attr("stroke", "black")
          .attr("stroke-width", ".5")
          .style("fill", "#69b3a2");

        focus.selectAll("#data--path")
          .transition()
          .duration(100)
          .ease(d3.easeBackOut)
          .remove();

        focus.append("path")
          .datum(data)
          .attr("id", "data--path")
          .attr("stroke", "steelblue")
          .attr("stroke-width", "2")
          .attr("clip-path", "url(#clip2)")
          .attr("d", d3.line()
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
              if (!idleTimeout) return idleTimeout = setTimeout(idled, idleDelay);
              x.domain(d3.extent(data, function (d) { return d["date"]; }));
              brushMode = false;
              //y.domain(d3.extent(data, function (d) { return +d[yTopic]; }));
            } else {
              x.domain(s.map(x.invert, x));
              brushMode = true;
              //y.domain([s[0][1], s[1][1]].map(y.invert, y));
              focus.select(".brush").call(brush.move, null);
            }
            zoom();
            onBrushCompleted(brushMode ? views : null);
          }

          zoom = function () {
            console.log("zoom");
            let transition = svg.transition().duration(750);
            svg.select("#axis--x").transition(transition).call(xAxis);
            svg.select("#axis2--x").transition(transition).call(xAxis2);
            svg.select("#axis--y").transition(transition).call(yAxis);
            focus.select("#data--path").transition(transition)
              .attr("d", d3.line()
                .x(function (d) {
                  let xValue = x(d.date);
                  onBrush(
                    brushMode, // brush mode
                    d, // value to update
                    xValue >= x.range()[0] && xValue <= x.range()[1], // brushed 
                    views // views to update
                  );
                  return xValue;
                })
                .y(function (d) { return y(d[yTopic]) })
              )

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
              (height + margin.bottom - 3 * margin.top) + ")")
            .style("text-anchor", "middle")
            .text("time");

          const brush = d3.brushX().extent([[0, 0], [width, height]]).on("end", brushended)

          focus.append("g")
            .attr("class", "brush")
            .call(brush);
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
      data = data.filter(d => { return brushMode ? d.selected && d.brushed : d.selected });
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
      data = data.filter(d => { return brushMode ? d.selected && d.brushed : d.selected });
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
