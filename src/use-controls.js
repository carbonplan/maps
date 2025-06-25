import React, { useState, useEffect, useCallback } from 'react'
import { flushSync } from 'react-dom'
import { useMap } from './map-provider'

export const useControls = () => {
  const { map } = useMap()
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
  }, [map])

  return { center: center, zoom: zoom }
}
