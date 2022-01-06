import { useEffect } from 'react'
import { ticks } from 'd3-array'
import { axisBottom, axisLeft } from 'd3-axis'
import { scaleOrdinal } from 'd3-scale'
import { select } from 'd3-selection'

import { useMapbox } from './mapbox'

const TICK_SEPARATION = 150 // target distance between ticks
const TICK_SIZE = 6 // tick length
const TICK_MARGIN = 2 // distance between gridlines and tick text

function useRuler({
  showAxes = true,
  showGrid = false,
  fontFamily,
  gridColor,
}) {
  const { map } = useMapbox()

  useEffect(() => {
    if (!showAxes && !showGrid) {
      return
    }

    let rulerContainer = null
    let setRulerTicks = null

    function addRuler() {
      const mapContainer = map.getContainer()
      const height = mapContainer.offsetHeight
      const width = mapContainer.offsetWidth
      const numXTicks = width / TICK_SEPARATION
      const numYTicks = height / TICK_SEPARATION

      rulerContainer = select(mapContainer)
        .append('svg')
        .classed('ruler', true)
        .attr('width', width)
        .attr('height', height)
        .style('position', 'absolute')
        .style('top', 0)
        .style('left', 0)
        .style('pointer-events', 'none')

      // x-axis
      const gx = rulerContainer
        .append('g')
        .classed('ruler-axis', true)
        .style('font-size', '14px')
        .style('font-family', fontFamily)

      const xAxis = (g, x) =>
        g
          .call(
            axisBottom(x)
              .tickValues(x.domain())
              .tickFormat((d) => `${d}°`)
              .tickSize(TICK_SIZE)
          )
          .call((g) => g.select('.domain').remove())

      // y-axis
      const gy = rulerContainer
        .append('g')
        .classed('ruler-axis', true)
        .attr('transform', `translate(${width},0)`)
        .style('font-size', '14px')
        .style('font-family', fontFamily)

      const yAxis = (g, y) =>
        g
          .call(
            axisLeft(y)
              .tickValues(y.domain())
              .tickFormat((d) => `${d}°`)
              .tickSize(TICK_SIZE)
          )
          .call((g) => g.select('.domain').remove())

      // grid
      const { gGrid, grid } = showGrid
        ? {
            gGrid: rulerContainer
              .append('g')
              .classed('ruler-grid', true)
              .style('stroke', gridColor)
              .style('stroke-dasharray', '3,2')
              .style('stroke-opacity', 0.8),

            grid: (g, x, y) => {
              const xTickHeight = gx.node().getBoundingClientRect().height
              const yTickNodes = gy.selectAll('.tick').nodes()
              return g
                .call((g) =>
                  g
                    .selectAll('.x')
                    .data(x.domain())
                    .join(
                      (enter) =>
                        enter
                          .append('line')
                          .classed('x', true)
                          .attr('y1', xTickHeight + TICK_MARGIN)
                          .attr('y2', height),
                      (update) => update,
                      (exit) => exit.remove()
                    )
                    .attr('x1', (d) => 0.5 + x(d))
                    .attr('x2', (d) => 0.5 + x(d))
                )
                .call((g) =>
                  g
                    .selectAll('.y')
                    .data(y.domain())
                    .join(
                      (enter) => enter.append('line').classed('y', true),
                      (update) => update,
                      (exit) => exit.remove()
                    )
                    .attr('y1', (d) => 0.5 + y(d))
                    .attr('y2', (d) => 0.5 + y(d))
                    .attr('x2', (d, i) => {
                      const yTickWidth = yTickNodes[i]
                        ? yTickNodes[i].getBoundingClientRect().width
                        : 0
                      return width - yTickWidth - TICK_MARGIN
                    })
                )
            },
          }
        : {
            gGrid: null,
            grid: null,
          }

      // the important bit
      setRulerTicks = () => {
        const b = map.getBounds()

        const xDomain = ticks(b.getWest(), b.getEast(), numXTicks)
        const xRange = xDomain.map((lng) => map.project([lng, 0]).x)
        const x = scaleOrdinal().domain(xDomain).range(xRange)

        const yDomain = ticks(b.getNorth(), b.getSouth(), numYTicks)
        const yRange = yDomain.map((lat) => map.project([0, lat]).y)
        const y = scaleOrdinal().domain(yDomain).range(yRange)

        if (showAxes) {
          gx.call(xAxis, x)
          gy.call(yAxis, y)
        }
        if (showGrid) {
          gGrid.call(grid, x, y)
        }
      }

      setRulerTicks()
      map.on('move', setRulerTicks)
    }

    function removeRuler() {
      if (rulerContainer) {
        rulerContainer.remove()
      }
      if (setRulerTicks) {
        map.off('move', setRulerTicks)
      }
    }

    function resetRuler() {
      removeRuler()
      addRuler()
    }

    addRuler()
    map.on('resize', resetRuler)

    return function cleanup() {
      removeRuler()
      map.off('resize', resetRuler)
    }
  }, [showAxes, showGrid, fontFamily, gridColor])
}

export default useRuler
