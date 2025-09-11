import Section from '../../components/section'

# MapProvider

The `MapProvider` component (imported from `@carbonplan/maps/core`) allows use of an external map object from Maplibre GL JS or Mapbox GL JS. Only the web-mercator projection is supported at this time.

```jsx
import { MapProvider, Raster } from '@carbonplan/maps/core'
import { useColormap } from '@carbonplan/colormaps'

const BringYourOwnMap = ({ map }) => {
  const colormap = useColormap('warm')
  return (
    <MapProvider
      map={map}
      style={{
        // Use z-index to control whether the zarr appears above or below main map
        zIndex: 2,
      }}
    >
      <Raster
        colormap={colormap}
        clim={[0, 25]}
        source={'path/to/zarr/pyramid'}
        variable={'climate'}
        selector={{ month, band }}
      />
    </MapProvider>
  )
}
```

export default ({ children }) => (

<Section name='mapprovider'>{children}</Section>)
