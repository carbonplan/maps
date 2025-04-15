import { useEffect, useRef } from 'react'
import { useMapbox } from './mapbox'
import { updatePaintProperty } from './utils'
import { v4 as uuidv4 } from 'uuid'

const Line = ({
  source,
  variable,
  color,
  id,
  maxZoom = 5,
  opacity = 1,
  blur = 0.4,
  width = 0.5,
  ndp = true,
}) => {
  const { map } = useMapbox()
  const removed = useRef(false)

  const sourceIdRef = useRef()
  const layerIdRef = useRef()

  useEffect(() => {
    map.on('remove', () => {
      removed.current = true
    })
  }, [])

  var sourceType;
  useEffect(() => {
    sourceIdRef.current = id || uuidv4()
    const { current: sourceId } = sourceIdRef
    if (!map.getSource(sourceId)) {
      if (ndp) {
        sourceType = 'vector';
        map.addSource(sourceId, {
          type: 'vector',
            tiles: [`${source}/{z}/{x}/{y}.pbf`],
        });
      } else {
        sourceType = 'geojson';
        map.addSource(sourceId, {
            type: 'geojson',
            data: source,
        });
      }
      if (maxZoom) {
        map.getSource(sourceId).maxzoom = maxZoom
      }
    }
  }, [id])

  useEffect(() => {
    const layerId = layerIdRef.current || uuidv4()
    layerIdRef.current = layerId
    const { current: sourceId } = sourceIdRef
    if (!map.getLayer(layerId)) {
      const layerConfig = {
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: { visibility: 'visible' },
        paint: {
          'line-blur': blur,
          'line-color': color,
          'line-opacity': opacity,
          'line-width': width,
        }
      };

      // Only include 'source-layer' if using a vector tile source
      if (sourceType === 'vector') {
        layerConfig['source-layer'] = variable;
      }
      map.addLayer(layerConfig);
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

  return null
}

export default Line
