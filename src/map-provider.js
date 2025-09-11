import React, { createContext, useContext } from 'react'
import { LoadingProvider, LoadingUpdater } from './loading'
import { RegionProvider } from './region/context'
import Regl from './regl'

const MapContext = createContext(null)

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
  if (!map) {
    throw new Error(
      '@carbonplan/maps: A map instance must be provided to MapProvider'
    )
  }
  if (map.getProjection && map.getProjection()?.name !== 'mercator') {
    throw new Error(
      '@carbonplan/maps: Only the web-mercator projection is supported at this time'
    )
  }

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
