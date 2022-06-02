import * as React from 'react'
import Mapbox from './mapbox'
import Regl from './regl'
import { RegionProvider } from './region/context'
import { LoadingProvider, LoadingUpdater } from './loading'
import type { LngLatLike, LngLatBoundsLike } from 'mapbox-gl'

type Props = {
  /** `id` used on `div` container node of `mapboxgl.Map` */
  id?: string
  /** `tabIndex` used on `div` container node of `mapboxgl.Map` */
  tabIndex?: number
  /** `className` used on `div` container node of `mapboxgl.Map` */
  className?: string
  /** `style` object used on `div` container node of `mapboxgl.Map` */
  style?: { [key: string]: string | number }
  /** `zoom` parameter passed to `mapboxgl.Map` */
  zoom?: number
  /** `minZoom` parameter passed to `mapboxgl.Map` */
  minZoom?: number
  /** `maxZoom` parameter passed to `mapboxgl.Map` */
  maxZoom?: number
  /** `maxbounds` parameter passed to `mapboxgl.Map` */
  maxBounds?: LngLatBoundsLike
  /** `center` parameter passed to `mapboxgl.Map` */
  center?: LngLatLike
  /** `debug` parameter passed to `mapboxgl.Map` */
  debug?: boolean
  /** `glyphs` parameter passed to `mapboxgl.Map` */
  glyphs?: string
  /** @carbonplan/maps JSX elements or regular components */
  children?: React.Node
  /** Tracks *any* pending requests made by containing `Raster` layers */
  setLoading?: (loading: boolean) => void
  /** Tracks any metadata and coordinate requests made on initialization by containing `Raster` layers */
  setMetadataLoading?: (loading: boolean) => void
  /** Tracks any requests of new chunks by containing `Raster` layers */
  setChunkLoading?: (loading: boolean) => void
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
  glyphs,
  children,
  setLoading,
  setMetadataLoading,
  setChunkLoading,
}: Props) => {
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
