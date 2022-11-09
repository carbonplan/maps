import React, { useState, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useMapbox } from './mapbox'

export const useControls = () => {
  const [zoom, setZoom] = useState()
  const [center, setCenter] = useState()
  const { map } = useMapbox()

  const updateControlsSync = useCallback(() => {
    flushSync(() => {
      setZoom(map.getZoom())
      setCenter(map.getCenter())
    })
  }, [])

  useEffect(() => {
    setZoom(map.getZoom())
    setCenter(map.getCenter())
    map.on('load', updateControlsSync)
    map.on('move', updateControlsSync)
  }, [map])

  return { center: center, zoom: zoom }
}
