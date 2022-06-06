import React, { useEffect, useRef } from 'react'
import { useMapbox } from './mapbox'
import { updatePaintProperty } from './utils'
import { v4 as uuidv4 } from 'uuid'

type Props = {
  /** URL pointing to vector tileset */
  source: string
  /** Name of `source-layer` */
  variable: string
  /** Fill color */
  color: string
  /** Key that triggers addition of source to `mapbox-gl-js` map */
  id?: string
  /** Maximum zoom for layer (defaults to 5) */
  maxZoom?: number
  /** Fill opacity (defaults to 1) */
  opacity?: number
}

const Fill = ({
  source,
  variable,
  color,
  id,
  maxZoom = 5,
  opacity = 1,
}: Props) => {
  const { map } = useMapbox()
  const removed = useRef(false)

  const sourceIdRef = useRef()
  const layerIdRef = useRef()

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
    const layerId = uuidv4()
    layerIdRef.current = layerId
    const { current: sourceId } = sourceIdRef
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        'source-layer': variable,
        layout: { visibility: 'visible' },
        paint: {
          'fill-color': color,
          'fill-opacity': opacity,
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
    updatePaintProperty(map, layerIdRef, 'fill-color', color)
  }, [color])

  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'fill-opacity', opacity)
  }, [opacity])

  return <></>
}

export default Fill
