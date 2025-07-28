import React, { useRef, useEffect, useState } from 'react'
import { useRegl } from './regl'
import { useMapbox } from './mapbox'
import { useControls } from './use-controls'
import { createTiles } from './tiles'
import { useRegion } from './region/context'
import { useSetLoading } from './loading'

const Raster = (props) => {
  const {
    display = true,
    opacity = 1,
    clim,
    colormap,
    index = 0,
    regionOptions = {},
    selector = {},
    uniforms = {},
    setMapVal,
    zoomArgs,
  } = props
  const { center, zoom } = useControls(zoomArgs)

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

  let filterValue = props.filterValue

  const queryRegion = async (r, s) => {
    const queryStart = new Date().getTime()
    lastQueried.current = queryStart

    regionOptions.setData({ value: null })

    const data = await tiles.current.queryRegion(r, s)

    // Invoke callback as long as a more recent query has not already been initiated
    if (lastQueried.current === queryStart) {
      regionOptions.setData({ value: data })
    }
  }

  // Set Map Val
  useEffect(() => {
    if (!map) return;
    const NO_DATA = 3.4028234663852886e+38;
    const handleMouseMove = async (e) => {
      const { lng, lat } = e.lngLat;
      const data = await tiles.current.queryPoint(lat, lng, selector);
      let value = data[0].value;
      if (value === NO_DATA) {
        value = null;
      }
      setMapVal(value);
      };
    map.on('mousemove', handleMouseMove);
    return () => map.off('mousemove', handleMouseMove);
  }, [map, selector]);

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
      if (Object.values(camera.current).some(Boolean)) {
        tiles.current.updateCamera(camera.current)
        tiles.current.draw()
      }
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
    tiles.current.updateFilter({ filterValue })
  }, [filterValue])

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
    ...Object.values(regionOptions?.selector || selector || {}),
  ])

  return null
}

export default Raster
