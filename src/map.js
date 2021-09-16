import React from 'react'
import Mapbox from './mapbox'
import Regl from './regl'
import { RegionProvider } from './region/context'

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
  children,
  containerStyle,
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
        ...containerStyle,
      }}
    >
      <Mapbox
        style={style}
        zoom={zoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxBounds={maxBounds}
        center={center}
        debug={debug}
        containerStyle={{ position: 'absolute' }}
      >
        <Regl
          extensions={extensions}
          containerStyle={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        >
          <RegionProvider>{children}</RegionProvider>
        </Regl>
      </Mapbox>
    </div>
  )
}

export default Map
