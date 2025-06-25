import React from 'react'
import Mapbox from './mapbox'
import { MapProvider } from './map-provider'
import { useMapbox } from './mapbox'

const MapboxToMapProvider = ({ extensions, children }) => {
  const { map } = useMapbox()
  return (
    <MapProvider map={map} extensions={extensions}>
      {children}
    </MapProvider>
  )
}

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
        <MapboxToMapProvider extensions={extensions}>
          {children}
        </MapboxToMapProvider>
      </Mapbox>
    </div>
  )
}

export default Map
