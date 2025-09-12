import { useRef, useEffect, useState } from 'react'
import { Box, useThemeUI } from 'theme-ui'
import { MapProvider, Raster } from '@carbonplan/maps/core'
import { useThemedColormap } from '@carbonplan/colormaps'
import { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const bucket = 'https://carbonplan-maps.s3.amazonaws.com/'
const basemapTiles = `${bucket}basemaps/ocean/{z}/{x}/{y}.pbf`

const Maplibre = () => {
  const { theme } = useThemeUI()
  const colormap = useThemedColormap('warm')
  const mapContainer = useRef()
  const map = useRef(null)
  const [isMapLoaded, setIsMapLoaded] = useState(false)

  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new Map({
        container: mapContainer.current,
        style: {
          version: 8,
          sources: {
            'ocean-source': {
              type: 'vector',
              tiles: [basemapTiles],
            },
          },
          layers: [
            {
              id: 'ocean-fill',
              type: 'fill',
              source: 'ocean-source',
              'source-layer': 'ocean',
              paint: {
                'fill-color': theme.rawColors.background,
                'fill-opacity': 1,
              },
            },
            {
              id: 'ocean-line',
              type: 'line',
              source: 'ocean-source',
              'source-layer': 'ocean',
              paint: {
                'line-color': theme.rawColors.primary,
                'line-width': 0.5,
                'line-opacity': 1,
              },
            },
          ],
        },
      })
      map.current.on('load', () => {
        setIsMapLoaded(true)
      })
    }
  }, [])

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setPaintProperty(
        'ocean-fill',
        'fill-color',
        theme.rawColors.background
      )
      map.current.setPaintProperty(
        'ocean-line',
        'line-color',
        theme.rawColors.primary
      )
    }
  }, [theme])

  return (
    <Box
      as='figure'
      ref={mapContainer}
      sx={{
        my: [6, 6, 6, 7],
        width: '100%',
        height: ['300px', '400px', '400px', '500px'],
        border: 'solid',
        borderColor: 'muted',
        borderWidth: '1px',
        borderRadius: '1px',
      }}
    >
      {isMapLoaded && map.current && (
        <MapProvider map={map.current} style={{ zIndex: -1 }}>
          <Raster
            colormap={colormap}
            clim={[-20, 30]}
            source={bucket + 'v2/demo/2d/tavg'}
            variable={'tavg'}
          />
        </MapProvider>
      )}
    </Box>
  )
}

export default Maplibre
