import React, { useRef, useEffect, useState } from 'react'
import { useRegl } from './regl'
import { useMapbox } from './mapbox'
import { useControls } from './use-controls'
import { createTiles } from './tiles'
import { useRegion } from './region/context'
import { useSetLoading } from './loading'

type RGB = [number, number, number]
type Props = {
  /** Boolean expressing whether contents should be drawn to canvas or not */
  display?: boolean
  /** Number value for alpha value used when painting to canvas */
  opacity?: number
  /** Array of limits for the color range, `[min, max]` */
  clim: [number, number]
  /** Array of vec3 arrays, each representing an RGB value to sample from */
  colormap: RGB[]
  /** Index used to trigger redraws */
  index?: any
  /** Object containing a `setData` callback and an optional `selector` object (falls back to `Raster`-level selector if not provided) */
  regionOptions?: {
    setData: ({ value: any }) => void
    selector?: { [key: string]: any }
  }
  /** _(N/A for 2D datasets)_ Object to index into non-spatial dimensions, maps variable name (string) to value (any) or array of values */
  selector?: { [key: string]: any }
  /** Object mapping custom uniform names (string) to values (float) for use in fragment shader	*/
  uniforms?: { [key: string]: number }
  /** URL pointing to Zarr group */
  source: string
  /** Name of array containing variable to be mapped */
  variable: string
  /** Fragment shader to use in place of default */
  frag?: string
  /** Value to map to null */
  fillValue?: number
  /** Display mode */
  mode?: 'grid' | 'dotgrid' | 'texture'
  /** Callback that is invoked with `.zmetadata` value once fetched */
  setMetadata?: (value: { [key: string]: any }) => void
  /** Callback to track *any* pending requests */
  setLoading?: (loading: boolean) => void
  /** Callback to track any metadata and coordinate requests made on initialization */
  setMetadataLoading?: (loading: boolean) => void
  /** Callback to track any requests of new chunks */
  setChunkLoading?: (loading: boolean) => void
}

const Raster = (props: Props) => {
  const {
    display = true,
    opacity = 1,
    clim,
    colormap,
    index = 0,
    regionOptions,
    selector = {},
    uniforms = {},
  } = props
  const { center, zoom } = useControls()
  const [regionDataInvalidated, setRegionDataInvalidated] = useState(
    new Date().getTime()
  )
  const { regl } = useRegl()
  const { map } = useMapbox()
  const { region } = useRegion()
  const { setLoading, clearLoading, loading, chunkLoading, metadataLoading } =
    useSetLoading()
  const tiles = useRef()
  const camera = useRef()
  const lastQueried = useRef()

  camera.current = { center: center, zoom: zoom }

  const queryRegion = async (r, s) => {
    const queryStart = new Date().getTime()
    lastQueried.current = queryStart

    regionOptions?.setData({ value: null })

    const data = await tiles.current.queryRegion(r, s)

    // Invoke callback as long as a more recent query has not already been initiated
    if (lastQueried.current === queryStart) {
      regionOptions?.setData({ value: data })
    }
  }

  useEffect(() => {
    tiles.current = createTiles(regl, {
      ...props,
      setLoading,
      clearLoading,
      invalidate: () => {
        map.triggerRepaint()
      },
      invalidateRegion: () => {
        setRegionDataInvalidated(new Date().getTime())
      },
    })
  }, [])

  useEffect(() => {
    if (props.setLoading) {
      props.setLoading(loading)
    }
  }, [!!props.setLoading, loading])
  useEffect(() => {
    if (props.setMetadataLoading) {
      props.setMetadataLoading(metadataLoading)
    }
  }, [!!props.setMetadataLoading, metadataLoading])
  useEffect(() => {
    if (props.setChunkLoading) {
      props.setChunkLoading(chunkLoading)
    }
  }, [!!props.setChunkLoading, chunkLoading])

  useEffect(() => {
    const callback = () => {
      tiles.current.updateCamera(camera.current)
      tiles.current.draw()
    }
    map.on('render', callback)

    return () => {
      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1,
      })
      map.off('render', callback)
      map.triggerRepaint()
    }
  }, [index])

  useEffect(() => {
    tiles.current.updateSelector({ selector })
  }, Object.values(selector))

  useEffect(() => {
    tiles.current.updateUniforms({ display, opacity, clim, ...uniforms })
  }, [display, opacity, clim, ...Object.values(uniforms)])

  useEffect(() => {
    tiles.current.updateColormap({ colormap })
  }, [colormap])

  useEffect(() => {
    if (region && regionOptions?.setData) {
      queryRegion(region, regionOptions.selector || selector)
    }
  }, [
    regionOptions?.setData,
    region,
    regionDataInvalidated,
    ...Object.values(regionOptions?.selector || {}),
    ...Object.values(selector),
  ])

  return <></>
}

export default Raster
