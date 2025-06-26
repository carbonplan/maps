import { geoPath, geoTransform } from 'd3-geo'

const normalizeLngLat = (coordinates) => {
  if (
    coordinates &&
    typeof coordinates.lng === 'number' &&
    typeof coordinates.lat === 'number'
  ) {
    return coordinates
  }
  if (Array.isArray(coordinates) && coordinates.length >= 2) {
    return { lng: coordinates[0], lat: coordinates[1] }
  }
  throw new Error(
    'Invalid coordinate format. Expected [lng, lat] or {lng, lat}'
  )
}

export const project = (map, coordinates, options = {}) => {
  const ll = normalizeLngLat(coordinates)

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
