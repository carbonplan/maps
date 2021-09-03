import { geoPath, geoTransform } from 'd3-geo'

export function getPathMaker(map) {
  const transform = geoTransform({
    point: function (lng, lat) {
      const point = map.project([lng, lat])
      this.stream.point(point.x, point.y)
    },
  })
  return geoPath().projection(transform)
}
