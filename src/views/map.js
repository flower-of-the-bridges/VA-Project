import * as d3 from 'd3'

export default function () {
  let data = {},
    width = 400,
    height = 400;

  let updateData;

  // Map and projection
  let projection = d3.geoMercator()
    .center([2, 47])                // GPS of location to zoom on
    .scale(1500)                       // This is like the zoom
    .translate([-width / 8, height / 16])

  let mapCallback = () => {console.log("map callback")}
  let onClick = (d) => {
    if (data.clickCount < 3 || d.properties.clicked) {
      d.properties.clicked = !d.properties.clicked;
      d.properties.clicked ? data.clickCount++ : data.clickCount--;
      data.wholeMap = data.clickCount == 0;
      mapCallback();
      updateData(); // this will go inside the map callback on the controller
      console.log("clicked %o . selected regions: %d", d, data.clickCount);
    }
  }
  const map = function (selection) {
    selection.each(function () {
      const dom = d3.select(this)
      const svg = dom.append('svg')
        .attr('class', 'bar-chart')
        .attr('height', height)
        .attr('width', width);

      updateData = function () {
        
        if (svg.select("#map").empty()) {
          // if map group doesn't exist, create it
          svg.append("g")
            .attr("id", "map");
        }
        
        // Draw the map
        svg.select("#map")
          .selectAll("path")
          .data(data.features) // set features
          .join(
            enter => enter
              .append("path")
              .attr("fill", "steelblue") // first time, no region is selected: all white 
              .attr("d", d3.geoPath()
                .projection(projection)
              )
              .style("stroke", "black")
              .on("click", d => {
                onClick(d);
              }),
            update => update
            // change fill property based on the selection
              .call(update => update
                .transition()
                .duration(1000)
                .style('fill', d => d.properties.clicked ? 'green' : 'steelblue')
              ),
            exit => exit
              .call(exit => exit
                .transition()
                .duration(650)
                .remove()
              )
          )
      }
    })
  }
  //
  map.data = function (_) {
    if (!arguments.length) return data
    data = _
    if (typeof updateData === 'function') updateData()
    return map
  }
  //
  map.bindCallback = (callback) => mapCallback = callback
  //
  return map
}
