import Section from '../../components/section'
import Table from '../../components/Table'

# Raster

The `Raster` component is responsible for initializing the `mapbox-gl-js` instance and making this available to any map layers rendered within it.

## Props

<Table>

| Prop               | Description                                                                                                                        | Default   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | --------- |
| source             | URL pointing to Zarr group                                                                                                         |           |
| variable           | Name of array containing variable to map                                                                                           |           |
| clim               | Array of limits for the color range, `[min, max]`                                                                                  |           |
| colormap           | Array of vec3 arrays, each representing an RGB value to sample from                                                                |           |
| selector           | _(N/A for 2D datasets)_ Object to index into non-spatial dimensions, maps variable name (string) to value (any) or array of values |           |
| _optional props_   |                                                                                                                                    |           |
| mode               | Display mode -- one of 'texture', 'grid', 'dotgrid'                                                                                | 'texture' |
| fillValue          | Value to map to null                                                                                                               | -9999     |
| display            | Boolean expressing whether contents should be drawn to canvas or not                                                               | `true`    |
| opacity            | Number value for alpha value used when painting to canvas                                                                          | 1         |
| index              | Value that, when changed, triggers a clear and redraw of the canvas                                                                | 0         |
| regionOptions      | Object containing a `setData` callback and an optional `selector` object (falls back to `Raster`-level `selector` if not provided) |           |
| frag               | Fragment shader to use in place of default                                                                                         |           |
| uniforms           | Object mapping custom uniform names (string) to values (float) for use in fragment shader                                          |           |
| setLoading         | Callback to track _any_ pending requests                                                                                           |           |
| setMetadataLoading | Callback to track any metadata and coordinate requests made on initialization                                                      |           |
| setChunkLoading    | Callback to track any requests of new chunks                                                                                       |           |

</Table>

## Selectors

TK

## Custom shader logic

TK

## Regional data

TK

## Loading

TK

export default ({ children }) => <Section name='raster'>{children}</Section>
