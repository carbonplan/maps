import React, { useState, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useMapbox } from './mapbox'

export const useControls = () => {
  const { map } = useMapbox()
  const [zoom, setZoom] = useState(map.getZoom())
  const [center, setCenter] = useState(map.getCenter())

  const updateControlsSync = useCallback(() => {
    flushSync(() => {
      setZoom(map.getZoom())
      setCenter(map.getCenter())
    })
  }, [])

  useEffect(() => {
    map.on('move', updateControlsSync)
    return () => {
      map.off('move', updateControlsSync)
    }
  }, [])

  return { center: center, zoom: zoom }
}
