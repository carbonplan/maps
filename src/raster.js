import React, { useRef, useEffect, useState } from 'react'
import { useRegl } from './regl'
import { useMapbox } from './mapbox'
import { useControls } from './use-controls'
import { createTiles } from './tiles'
import { useRegion } from './region/context'

const Raster = (props) => {
  const {
    display = true,
    opacity = 1,
    clim,
    colormap,
    regionOptions = {},
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
  const tiles = useRef()
  const camera = useRef()
  const lastQueried = useRef()

  camera.current = { center: center, zoom: zoom }

  const queryRegion = async (r) => {
    const queryStart = new Date().getTime()
    lastQueried.current = queryStart

    regionOptions.setData({ value: null })

    const data = await tiles.current.queryRegion(r)

    // Invoke callback as long as a more recent query has not already been initiated
    if (lastQueried.current === queryStart) {
      regionOptions.setData({ value: data })
    }
  }

  useEffect(() => {
    tiles.current = createTiles(regl, {
      ...props,
      invalidate: () => {
        map.triggerRepaint()
      },
      invalidateRegion: () => {
        setRegionDataInvalidated(new Date().getTime())
      },
    })
  }, [])

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
    }
  }, [])

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
      queryRegion(region)
    }
  }, [regionOptions?.setData, region, regionDataInvalidated])

  return null
}

export default Raster
