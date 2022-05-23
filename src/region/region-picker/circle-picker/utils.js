import { geoPath, geoTransform } from 'd3-geo'
import mapboxgl from 'mapbox-gl'

export const project = (map, coordinates, options = {}) => {
  // Convert any LngLatLike to LngLat
  const ll = mapboxgl.LngLat.convert(coordinates)

  let result = map.project(ll)

  // When present, use referencePoint to find closest renderable point
  const { referencePoint } = options
  if (referencePoint) {
    const deltas = [-360, 360]
    deltas.forEach((delta) => {
      const alternate = map.project({ lat: ll.lat, lng: ll.lng + delta })
      if (
        Math.abs(alternate.x - referencePoint.x) <
        Math.abs(result.x - referencePoint.x)
      ) {
        result = alternate
      }
    })
  }

  return result
}

export function getPathMaker(map, options) {
  const transform = geoTransform({
    point: function (lng, lat) {
      const point = project(map, [lng, lat], options)
      this.stream.point(point.x, point.y)
    },
  })
  return geoPath().projection(transform)
}
