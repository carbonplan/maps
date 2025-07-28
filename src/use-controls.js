import React, { useEffect, useCallback, useRef } from 'react'
import { flushSync } from 'react-dom'
import { useMapbox } from './mapbox'

export const useControls = (zoomArgs) => {
  const { map } = useMapbox()
  const { center, setCenter, zoom, setZoom, onZoomChange, mapId } = zoomArgs
  const updatingFromParent = useRef(false)

  // Sync FROM parent (other map) to this map
  useEffect(() => {
      if (!map || !center || zoom == null) return
    const mapCenter = map.getCenter()
    const mapZoom = map.getZoom()

    // Only update if it's actually different
    if (mapCenter.lat !== center.lat || mapCenter.lng !== center.lng || mapZoom !== zoom) {
          updatingFromParent.current = true
      map.jumpTo({ center, zoom })   // jump instantly without animation
      updatingFromParent.current = false
    }
  }, [map, center, zoom])

  // Handle user moving THIS map
  const updateControlsSync = useCallback(() => {
    if (updatingFromParent.current) return  // prevent feedback loops
    flushSync(() => {
      const newZoom = map.getZoom()
      const newCenter = map.getCenter()
      setZoom(newZoom)
      setCenter(newCenter)
      if (onZoomChange) {
              onZoomChange({ lat: newCenter.lat, lng: newCenter.lng }, newZoom, mapId)
      }
    })
  }, [map, mapId, onZoomChange, setZoom, setCenter])

  // Attach to move for smooth updates
  useEffect(() => {
    if (!map) return
    map.on('move', updateControlsSync)
    return () => map.off('move', updateControlsSync)
  }, [map, updateControlsSync])

  return { center, zoom }
}
