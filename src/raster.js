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
    setRegionData,
    activeIndex = [],
    uniforms = {},
  } = props
  const { center, zoom } = useControls()
  const { regl } = useRegl()
  const { map } = useMapbox()
  const { region } = useRegion()
  const tiles = useRef()
  const camera = useRef()
  const lastQueried = useRef()
  const [viewport, setViewport] = useState({
    viewportHeight: 0,
    viewportWidth: 0,
  })

  camera.current = { center, zoom, viewport, activeIndex }

  const queryRegion = async (r) => {
    const queryStart = new Date().getTime()
    lastQueried.current = queryStart

    setRegionData({ loading: true })

    const data = await tiles.current.queryRegion(r)

    // Invoke callback as long as a more recent query has not already been initiated
    if (lastQueried.current === queryStart) {
      setRegionData({ loading: false, value: data })
    }
  }

  useEffect(() => {
    tiles.current = createTiles(regl, props)
  }, [])

  useEffect(() => {
    map.on('render', () => {
      tiles.current.updateCamera(camera.current)
      tiles.current.draw()
    })
  }, [])

  // Listen for changes to the viewport dimensions in regl context
  useEffect(() => {
    regl.frame(({ viewportHeight, viewportWidth }) => {
      setViewport((previousViewport) => {
        if (
          previousViewport.viewportHeight !== viewportHeight ||
          previousViewport.viewportWidth !== viewportWidth
        ) {
          return { viewportHeight, viewportWidth }
        } else {
          return previousViewport
        }
      })
    })
  }, [])

  // Ensure that tiles are redrawn when viewport dimensions have changed.
  // Because the regl dimensions are updated via polling, tiles drawn on
  // map `render` will use stale dimensions under some race conditions.
  useEffect(() => {
    tiles.current.redraw()
  }, [viewport])

  useEffect(() => {
    tiles.current.updateUniforms({ display, opacity, clim, ...uniforms })
    tiles.current.redraw()
  }, [display, opacity, clim, ...Object.values(uniforms)])

  useEffect(() => {
    if (map.loaded()) {
      tiles.current.updateCamera(camera.current)
      tiles.current.redraw()
    }
  }, activeIndex)

  useEffect(() => {
    tiles.current.updateColormap({ colormap })
    tiles.current.redraw()
  }, [colormap])

  useEffect(() => {
    if (region && setRegionData) {
      queryRegion(region)
    }
  }, [setRegionData, region])

  return null
}

export default Raster
