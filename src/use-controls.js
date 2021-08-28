import React, { useState, useEffect } from 'react'
import { useMapbox } from './mapbox'

export const useControls = () => {
  const [zoom, setZoom] = useState()
  const [center, setCenter] = useState()
  const { map } = useMapbox()

  useEffect(() => {
    setZoom(map.getZoom())
    setCenter(map.getCenter())
    map.on('load', () => {
      setZoom(map.getZoom())
      setCenter(map.getCenter())
    })
    map.on('move', () => {
      setCenter(map.getCenter())
      setZoom(map.getZoom())
    })
  }, [map])

  return { center: center, zoom: zoom }
}
