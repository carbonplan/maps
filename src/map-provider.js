import React, { createContext, useContext } from 'react'
import { LoadingProvider } from './loading'
import { RegionProvider } from './region/context'
import Regl from './regl'

const MapContext = createContext(null)

export const MapProvider = ({ map, extensions, children, style }) => {
  if (!map) {
    throw new Error(
      '@carbonplan/maps: A map instance must be provided to MapProvider'
    )
  }

  return (
    <MapContext.Provider value={{ map }}>
      <LoadingProvider>
        <RegionProvider>
          <Regl
            extensions={extensions}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              pointerEvents: 'none',
              zIndex: -1,
              ...style,
            }}
          >
            {children}
          </Regl>
        </RegionProvider>
      </LoadingProvider>
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
