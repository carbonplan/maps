import { geoPath, geoTransform } from 'd3-geo'

// TODO: Ensure that transformation always creates a contiguous circle.
// `map.project` may return points in non-adjacent tile if that tile is
// rendered > 1 time on map.
export function getPathMaker(map) {
  const transform = geoTransform({
    point: function (lng, lat) {
      const point = map.project([lng, lat])
      this.stream.point(point.x, point.y)
    },
  })
  return geoPath().projection(transform)
}
