import React, { useState, useRef, useCallback, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import { MapProvider } from './map-provider'

const Mapbox = ({
  glyphs,
  style,
  center,
  zoom,
  minZoom,
  maxZoom,
  maxBounds,
  debug,
  extensions,
  children,
  setLoading,
  setMetadataLoading,
  setChunkLoading,
}) => {
  const map = useRef()
  const [ready, setReady] = useState()

  const ref = useCallback((node) => {
    const mapboxStyle = { version: 8, sources: {}, layers: [] }
    if (glyphs) {
      mapboxStyle.glyphs = glyphs
    }
    if (node !== null) {
      map.current = new mapboxgl.Map({
        container: node,
        style: mapboxStyle,
        minZoom: minZoom,
        maxZoom: maxZoom,
        maxBounds: maxBounds,
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true,
      })
      if (zoom) map.current.setZoom(zoom)
      if (center) map.current.setCenter(center)
      map.current.on('styledata', () => {
        setReady(true)
      })
    }
  }, [])

  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove()
        setReady(false)
      }
    }
  }, [])

  useEffect(() => {
    map.current.showTileBoundaries = debug
  }, [debug])

  return (
    <>
      <div
        style={{
          top: '0px',
          bottom: '0px',
          position: 'absolute',
          width: '100%',
          ...style,
        }}
        ref={ref}
      />
      {ready && map.current && (
        <MapProvider
          map={map.current}
          extensions={extensions}
          setLoading={setLoading}
          setMetadataLoading={setMetadataLoading}
          setChunkLoading={setChunkLoading}
        >
          {children}
        </MapProvider>
      )}
    </>
  )
}

export default Mapbox
