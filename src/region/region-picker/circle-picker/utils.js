import { geoPath, geoTransform } from 'd3-geo'
import mapboxgl from 'mapbox-gl'

export const project = (map, point) => {
  // Convert any LngLatLike to LngLat
  const ll = mapboxgl.LngLat.convert(point)

  let result = map.project(ll)
  if (result.x < 0) {
    // Explicitly force Mapbox to project point with positive longitude
    result = map.project({ lat: ll.lat, lng: ll.lng + 360 })
  }

  return result
}

// TODO: Ensure that transformation always creates a contiguous circle.
// `map.project` may return points in non-adjacent tile if that tile is
// rendered > 1 time on map.
export function getPathMaker(map) {
  const transform = geoTransform({
    point: function (lng, lat) {
      const point = project(map, [lng, lat])
      this.stream.point(point.x, point.y)
    },
  })
  return geoPath().projection(transform)
}
