import Section from '../../components/section'
import Table from '../../components/Table'

# Map

The `Map` component is responsible for initializing the `mapbox-gl-js` instance and making this available to any map layers rendered within it.

## Props

<Table>

| Prop               | Description                                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| _optional props_   |                                                                                                                                                        |
| children           | `@carbonplan/maps` JSX elements or regular components                                                                                                  |
| style              | `style` object used on `div` container node of `mapboxgl.Map`                                                                                          |
| zoom               | `zoom` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`                                              |
| minZoom            | `minZoom` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`                                           |
| maxZoom            | `maxZoom` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`                                           |
| maxBounds          | `maxBounds` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`                                         |
| center             | `center` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`                                            |
| debug              | `debug` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`, controls whether tile grid lines are shown |
| glyphs             | `glyphs` [parameter](https://docs.mapbox.com/mapbox-gl-js/api/map/#map-parameters) passed to `mapboxgl.Map`                                            |
| setLoading         | Tracks _any_ pending requests made by containing `Raster` layers                                                                                       |
| setMetadataLoading | Tracks any metadata and coordinate requests made on initialization by containing `Raster` layers                                                       |
| setChunkLoading    | Tracks any requests of new chunks by containing `Raster` layers                                                                                        |

</Table>

## Loading

TK

export default ({ children }) => <Section name='map'>{children}</Section>
