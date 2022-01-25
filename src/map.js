import React from 'react'
import Mapbox from './mapbox'
import Regl from './regl'
import { RegionProvider } from './region/context'
import { LoadingProvider, LoadingUpdater } from './loading'

const Map = ({
  id,
  tabIndex,
  className,
  style,
  zoom,
  minZoom,
  maxZoom,
  maxBounds,
  center,
  debug,
  extensions,
  glyphs,
  children,
  setLoading,
  setInitializing,
  setFetching,
}) => {
  return (
    <div
      id={id}
      tabIndex={tabIndex}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        ...style,
      }}
    >
      <Mapbox
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxBounds={maxBounds}
        center={center}
        debug={debug}
        glyphs={glyphs}
        style={{ position: 'absolute' }}
      >
        <Regl
          extensions={extensions}
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <LoadingProvider>
            <LoadingUpdater
              setLoading={setLoading}
              setInitializing={setInitializing}
              setFetching={setFetching}
            />
            <RegionProvider>{children}</RegionProvider>
          </LoadingProvider>
        </Regl>
      </Mapbox>
    </div>
  )
}

export default Map
