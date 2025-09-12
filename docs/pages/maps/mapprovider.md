import Section from '../../components/section'
import Table from '../../components/table'
import Maplibre from '../../components/examples/maplibre'

# MapProvider

The `MapProvider` component (imported from `@carbonplan/maps/core`) allows use of an external map object from Maplibre GL JS or Mapbox GL JS. Only the web-mercator projection is supported at this time. All imports should be from the `/core` namespace when used with `MapProvider` to avoid bundling unneeded mapbox-gl dependencies and mixing react context.

<Table>

| Prop               | Description                                                                                      | Default |
| ------------------ | ------------------------------------------------------------------------------------------------ | ------- |
| map                | Maplibre or Mapbox map instance                                                                  |
| style              | css object for `@carbonplan/maps` canvas. Use `zIndex` to bring canvas above or below main map.  |
| setLoading         | Tracks _any_ pending requests made by containing `Raster` layers                                 |
| setMetadataLoading | Tracks any metadata and coordinate requests made on initialization by containing `Raster` layers |
| setChunkLoading    | Tracks any requests of new chunks by containing `Raster` layers                                  |

</Table>

```jsx
import { useRef, useEffect, useState } from 'react'
import { useThemedColormap } from '@carbonplan/colormaps'

import { MapProvider, Raster } from '@carbonplan/maps/core'
import { Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

const BringYourOwnMap = () => {
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
            // basemap sources
          },
          layers: [
            // basemap layers
          ],
        },
      })
      map.current.on('load', () => {
        setIsMapLoaded(true)
      })
    }
  }, [])

  return (
    <Box ref={mapContainer}>
      {isMapLoaded && map.current && (
        <MapProvider
          map={map.current}
          style={{
            zIndex: -1, // place raster below main map
          }}
        >
          <Raster
            colormap={colormap}
            clim={[-20, 30]}
            source={'demo/tavg'}
            variable={'tavg'}
          />
        </MapProvider>
      )}
    </Box>
  )
}
```

<Maplibre />

export default ({ children }) => (

<Section name='mapprovider'>{children}</Section>
)
