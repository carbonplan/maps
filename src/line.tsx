import React, { useEffect, useRef } from 'react'
import { useMapbox } from './mapbox'
import { updatePaintProperty } from './utils'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  /** URL pointing to vector tileset */
  source: string
  /** Name of `source-layer` */
  variable: string
  /** Line color */
  color: string
  /** Key that triggers addition of source to `mapbox-gl-js` map */
  id?: string
  /** Maximum zoom for layer (defaults to 5) */
  maxZoom?: number
  /** Line width (defaults to 0.5) */
  width?: number
  /** Line blur (defaults to 0.4) */
  blur?: number
  /** Line opacity (defaults to 1) */
  opacity?: number
}

const Line = ({
  source,
  variable,
  color,
  id,
  maxZoom = 5,
  opacity = 1,
  blur = 0.4,
  width = 0.5,
}: Props) => {
  const { map } = useMapbox()
  const removed = useRef(false)

  const sourceIdRef = useRef<string>()
  const layerIdRef = useRef<string>()

  useEffect(() => {
    map.on('remove', () => {
      removed.current = true
    })
  }, [])

  useEffect(() => {
    const sourceId = id || uuidv4()
    sourceIdRef.current = sourceId
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [`${source}/{z}/{x}/{y}.pbf`],
        maxzoom: maxZoom,
      })
    }
  }, [id])

  useEffect(() => {
    const layerId = layerIdRef.current || uuidv4()
    layerIdRef.current = layerId
    const { current: sourceId } = sourceIdRef
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        'source-layer': variable,
        layout: { visibility: 'visible' },
        paint: {
          'line-blur': blur,
          'line-color': color,
          'line-opacity': opacity,
          'line-width': width,
        },
      })
    }

    return () => {
      if (!removed.current) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId)
        }
      }
    }
  }, [])

  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-color', color)
  }, [color])

  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-opacity', opacity)
  }, [opacity])

  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-width', width)
  }, [width])

  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-blur', blur)
  }, [blur])

  return <></>
}

export default Line
