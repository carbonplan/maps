import type { Feature, Polygon } from '@turf/turf'
import type { LngLat } from 'mapbox-gl'

export type Circle = Feature<
  Polygon,
  {
    center: LngLat
    radius: number
    units: string
  }
>
