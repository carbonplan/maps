import * as React from 'react'
import Mapbox from './mapbox'
import Regl from './regl'
import { RegionProvider } from './region/context'
import { LoadingProvider, LoadingUpdater } from './loading'
import type { LngLatLike, LngLatBoundsLike } from 'mapbox-gl'

type Props = {
  id?: string
  tabIndex?: number
  className?: string
  style?: { [key: string]: string }
  zoom?: number
  minZoom?: number
  maxZoom?: number
  maxBounds?: LngLatBoundsLike
  center?: LngLatLike
  debug?: boolean
  glyphs?: string
  /** Tracks *any* pending requests made by containing `Raster` layers */
  setLoading?: (loading: boolean) => void
  /** Tracks any metadata and coordinate requests made on initialization by containing `Raster` layers */
  setMetadataLoading?: (loading: boolean) => void
  /** Tracks any requests of new chunks by containing `Raster` layers */
  setChunkLoading?: (loading: boolean) => void
}
const Map: React.FC<Props> = ({
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
  glyphs,
  children,
  setLoading,
  setMetadataLoading,
  setChunkLoading,
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
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: -1,
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
      </Mapbox>
    </div>
  )
}

export default Map
