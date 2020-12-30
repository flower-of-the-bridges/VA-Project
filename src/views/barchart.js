import * as d3 from 'd3'

export default function() {
  let data = [],
      width = 400,
      height = 400,
      barPadding = 1
  let updateData,
      updateWidth,
      updateHeight
  let onClick = (d) => {console.log(d)}
  const barchart = function(selection) {
    selection.each(function() {
      let barSpacing = data.length > 0 ? height / data.length : 0
      let barHeight = barSpacing - barPadding
      let maxValue = Math.max(...data.map(d => d.value))
      let widthScale = width / maxValue
      const dom = d3.select(this)
      const svg = dom.append('svg')
        .attr('class', 'bar-chart')
        .attr('height', height)
        .attr('width', width)
      svg.selectAll('rect.display-bar')
        .data(data, d => d.id)
        .join(
          enter => enter.append('rect')
            .attr('class', 'display-bar')
            .attr('x', 0)
            .attr('width', function (d) { return d.value * widthScale })
            .attr('y', function (_d, i) { return i * barSpacing  })
            .attr('height', barHeight)
            .style('fill', d => d.selected ? 'green' : 'red')
            .on('click', (_e, d) => onClick(_e))
        )
      
      //
      updateData = function() {
        barSpacing = height / data.length
        barHeight = barSpacing - barPadding
        maxValue = Math.max(...data.map(d => d.value))
        widthScale = width / maxValue
        svg.selectAll('rect.display-bar')
          .data(data, d => d.id)
          .join(
            enter => enter.append('rect')
              .attr('class', 'display-bar')
              .attr('x', 0)
              .attr('width', function (d) { return d.value * widthScale })
              .attr('y', function (_d, i) { return i * barSpacing  })
              .attr('height', barHeight)
              .style('fill', d => d.selected ? 'green' : 'red')
              .on('click', (_e, d) => onClick(_e)),
            update => update
              .call(update => update
                .transition()
                .duration(1000)
                .attr('y', function(_d, i) { return i * barSpacing; })
                .attr('height', barHeight)
                .style('fill', d => d.selected ? 'green' : 'red')
              ),
            exit => exit
              .call(exit => exit
                .transition()
                .duration(650)
                .remove()
              )
          )
      }
      updateWidth = function() {
        widthScale = width / maxValue
        svg.selectAll('rect.display-bar')
          .transition().duration(1000)
            .attr('width', function (d) { return d.value * widthScale })
        svg.transition().duration(1000).attr('width', width)
      }
      updateHeight = function() {
        barSpacing = height / data.length
        barHeight = barSpacing - barPadding
        svg.selectAll('rect.display-bar')
          .transition().duration(1000)
            .attr('y', function(d, i) { return i * barSpacing })
            .attr('height', barHeight)
        svg.transition().duration(1000).attr('height', height)
      }
    })
  }
  //
  barchart.data = function(_) {
    if (!arguments.length) return data
    data = _
    if (typeof updateData === 'function') updateData()
    return barchart
  }
  barchart.width = function(_) {
    if (!arguments.length) return width
    width = _
    if (typeof updateWidth === 'function') updateWidth()
    return barchart
  }
  barchart.height = function(_) {
    if (!arguments.length) return height
    height = _
    if (typeof updateHeight === 'function') updateHeight()
    return barchart
  }
  //
  barchart.bindClick = (callback) => onClick = callback
  //
  return barchart
}
