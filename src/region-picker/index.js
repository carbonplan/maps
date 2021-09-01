import React, { useEffect, useState, useRef, useCallback } from 'react'
import CirclePicker from './circle-picker'
import { UPDATE_STATS_ON_DRAG } from './constants'
import { distance } from '@turf/turf'

import { useRegion } from '../region/context'
import { useMapbox } from '../mapbox'

function getInitialRadius(map) {
  const bounds = map.getBounds().toArray()
  const dist = distance(bounds[0], bounds[1], { units: 'miles' })
  return Math.min(Math.round(dist / 15), 300)
}

function RegionPicker({
  backgroundColor,
  color,
  fontFamily,
  onChangeReset = () => {},
}) {
  const { map } = useMapbox()
  const initialCenter = useRef(map.getCenter())
  const initialRadius = useRef(getInitialRadius(map))
  const { onChange } = useRegion()

  const [center, setCenter] = useState(initialCenter.current)

  useEffect(() => {
    onChangeReset(() => map.easeTo({ center: center }))
  }, [center])

  const handleCircle = useCallback((circle) => {
    if (!circle) return
    onChange(circle)
    setCenter(circle.properties.center)
  }, [])

  return (
    <CirclePicker
      map={map}
      center={initialCenter.current}
      radius={initialRadius.current}
      onDrag={UPDATE_STATS_ON_DRAG ? handleCircle : undefined}
      onIdle={handleCircle}
      backgroundColor={backgroundColor}
      color={color}
      fontFamily={fontFamily}
    />
  )
}

export default RegionPicker
