import * as d3 from 'd3'

export function getPathMaker(map) {
  const transform = d3.geoTransform({
    point: function (lng, lat) {
      const point = map.project([lng, lat])
      this.stream.point(point.x, point.y)
    },
  })
  return d3.geoPath().projection(transform)
}
