import React, { useState, useRef, useCallback, useEffect } from 'react'
import CirclePicker from './circle-picker'
import { UPDATE_STATS_ON_DRAG } from './constants'
import { distance } from '@turf/turf'
import { v4 as uuidv4 } from 'uuid'

import { useRegionContext } from '../context'
import { useMapbox } from '../../mapbox'
import mapboxgl from 'mapbox-gl'

function getInitialRadius(map, units, minRadius, maxRadius) {
  const bounds = map.getBounds().toArray()
  const dist = distance(bounds[0], bounds[1], { units })
  let radius = Math.round(dist / 15)
  radius = minRadius ? Math.max(minRadius, radius) : radius
  radius = maxRadius ? Math.min(maxRadius, radius) : radius

  return radius
}

function isValidCoordinate(longitude, latitude) {
  return (
    longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90
  )
}

// TODO:
// - accept mode (only accept mode="circle" to start)
function RegionPicker({
  backgroundColor,
  color,
  fontFamily,
  fontSize,
  units = 'kilometers',
  initialRadius: initialRadiusProp,
  initialCenter: initialCenterProp,
  minRadius,
  maxRadius,
}) {
  const { map } = useMapbox()
  const id = useRef(uuidv4())

  let safeInitialCenter
  if (isValidCoordinate(initialCenterProp[0], initialCenterProp[1])) {
    safeInitialCenter = new mapboxgl.LngLat(
      initialCenterProp[0],
      initialCenterProp[1]
    )
  } else {
    safeInitialCenter = map.getCenter()
    console.warn(
      `Invalid initial center coordinates: ${initialCenterProp}, Falling back to map's current center.`
    )
  }
  const initialCenter = useRef(safeInitialCenter)

  const initialRadius = useRef(
    initialRadiusProp || getInitialRadius(map, units, minRadius, maxRadius)
  )
  const { setRegion } = useRegionContext()

  const [center, setCenter] = useState(initialCenter.current)

  useEffect(() => {
    return () => {
      // Clear region when unmounted
      setRegion(null)
    }
  }, [])

  const handleCircle = useCallback((circle) => {
    if (!circle) return
    setRegion(circle)
    setCenter(circle.properties.center)
  }, [])

  // TODO: consider extending support for degrees and radians
  if (!['kilometers', 'miles'].includes(units)) {
    throw new Error('Units must be one of miles, kilometers')
  }

  return (
    <CirclePicker
      id={id.current}
      map={map}
      center={initialCenter.current}
      radius={initialRadius.current}
      onDrag={UPDATE_STATS_ON_DRAG ? handleCircle : undefined}
      onIdle={handleCircle}
      backgroundColor={backgroundColor}
      color={color}
      units={units}
      fontFamily={fontFamily}
      fontSize={fontSize}
      maxRadius={maxRadius}
      minRadius={minRadius}
    />
  )
}

export default RegionPicker
