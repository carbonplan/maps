import React, { createContext, useContext, useEffect } from 'react'
import { LoadingProvider, LoadingUpdater } from './loading'
import { RegionProvider } from './region/context'
import Regl from './regl'

const MapContext = createContext(null)

const validateMapInstance = (map) => {
  if (!map) {
    throw new Error(
      '@carbonplan/maps: A map instance must be provided to MapProvider'
    )
  }
  if (map.getProjection) {
    const projection = map.getProjection()
    // projection is undefined by default in maplibre-gl
    if (projection) {
      if (projection.name !== 'mercator' || projection.type !== 'mercator') {
        throw new Error(
          '@carbonplan/maps: Only the web-mercator projection is supported at this time'
        )
      }
    }
  }

  const requiredMethods = [
    'on',
    'off',
    'once',
    'remove',
    'loaded',
    'getZoom',
    'setZoom',
    'setPitch',
    'setBearing',
    'getCenter',
    'setCenter',
    'getBounds',
    'project',
    'unproject',
    'easeTo',
    'getSource',
    'addSource',
    'getLayer',
    'addLayer',
    'removeLayer',
    'setPaintProperty',
    'triggerRepaint',
    'getContainer',
    'getCanvas',
    'zoomIn',
    'zoomOut',
  ]

  const missingMethods = requiredMethods.filter(
    (method) => typeof map[method] !== 'function'
  )

  const touchMethods = [
    { name: 'touchPitch', method: 'disable' },
    { name: 'dragPan', method: 'disable' },
    { name: 'dragRotate', method: 'disable' },
    { name: 'touchZoomRotate', method: 'disableRotation' },
  ]

  touchMethods.forEach(({ name, method }) => {
    if (map[name] && typeof map[name][method] !== 'function') {
      missingMethods.push(`${name}.${method}`)
    }
  })

  if (missingMethods.length > 0) {
    throw new Error(
      `@carbonplan/maps: Map instance is missing required methods: ${missingMethods.join(
        ', '
      )}`
    )
  }
}

const disableUnsupportedControls = (map) => {
  map.touchZoomRotate.disableRotation()
  map.dragRotate.disable()
  map.touchPitch.disable()
}

const setMapView = (map) => {
  map.setPitch(0)
  map.setBearing(0)
}

export const MapProvider = ({
  map,
  extensions,
  children,
  style = {},
  /** Tracks *any* pending requests made by containing `Raster` layers */
  setLoading,
  /** Tracks any metadata and coordinate requests made on initialization by containing `Raster` layers */
  setMetadataLoading,
  /** Tracks any requests of new chunks by containing `Raster` layers */
  setChunkLoading,
}) => {
  useEffect(() => {
    validateMapInstance(map)
    setMapView(map)
    disableUnsupportedControls(map)
  }, [map])

  return (
    <MapContext.Provider value={{ map }}>
      <Regl
        extensions={extensions}
        style={{
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: -1,
          ...style,
        }}
      >
        <LoadingProvider>
          <LoadingUpdater
            setLoading={setLoading}
            setMetadataLoading={setMetadataLoading}
            setChunkLoading={setChunkLoading}
          />
          <RegionProvider>{children}</RegionProvider>
        </LoadingProvider>
      </Regl>
    </MapContext.Provider>
  )
}

export const useMap = () => {
  const context = useContext(MapContext)

  if (!context) {
    throw new Error(
      '@carbonplan/maps: useMap must be used within a MapProvider'
    )
  }
  return context
}
