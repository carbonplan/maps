import Section from '../../components/section'
import Table from '../../components/table'
import LoadingDemo from '../../components/examples/loading-demo'

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
| setMetadata        | Callback that is invoked with `.zmetadata` value once fetched                                                                      |           |

</Table>

## Selectors

### Single values

The `selector` prop is required for any dataset > 2D (dimensions other than lat, lng). This will commonly be wired up to user input. For example, rendering a single time point from a monthly dataset might look something like:

```jsx
const [month, setMonth] = useState('January')

...

return (
    <>
        <MonthInput value={month} onChange={setMonth} />
        <Map>
            <Raster {...props} selector={{month}}>
        </Map>
    </>
)
```

### Multiple values

You may also be interested in using multiple values along a particular dimension at once. You can include arrays of values in `selector` to handle this.

Each element in the values arrays `selector` is mapped and stored in a custom uniform for access in the fragment shader. For string array values, the value will be used directly. Otherwise, the array value will be appended to the `selector`. For example, `{month: ['jan', 'feb', 'mar']}` will generate the uniforms `jan`, `feb`, and `mar` while `{month: [1, 2, 3]}` will generate the uniforms `month_1`, `month_2`, and `month_3`.

Because the selector values dictate uniform definition, array-based selector values must not change between renders. Fully integrating with the selected values requires custom shader logic (see below).

## Custom shader logic

You may provide custom fragment shader logic using the `frag` prop. This logic will have access to `colormap`, `clim`, `fillValue`, `opacity`, custom `uniforms`, and variables derived from data (`variable` for a 2D selection, otherwise following the logic in "Multiple values" above).

For example, a layer that allows user to select a subset of values to average over might look like:

```jsx
<Raster
    {...props}
    selector={{measure: ['one', 'two', 'three']}}
    uniforms={{
        include_one: range.includes('one') ? 1 : 0,
        include_two: range.includes('two') ? 1 : 0,
        include_three: range.includes('three') ? 1 : 0,
    }}
    frag={`
        float sum = 0.0
        if (include_one == 1.0) {
            sum = sum + one;
        }
        if (include_two == 1.0) {
            sum = sum + two;
        }
        if (include_three == 1.0) {
            sum = sum + three;
        }
        float average = sum / (include_one + include_two + include_three)
        float rescaled = (average - clim.x)/(clim.y - clim.x);
        gl_FragColor = texture2D(colormap, vec2(rescaled, 1.0));
    `}
>
```

## Regional data

See the [`RegionPicker`](/maps/regionpicker) docs for guidance using the `regionOptions` prop.

## Loading

You may use any combination of the loading callback props to track the loading state of a particular `Raster` layer. The last value passed to each of the three callbacks, `setLoading`, `setMetadataLoading`, and `setChunkLoading` are overlaid on the map below.

<LoadingDemo raster />

export default ({ children }) => <Section name='raster'>{children}</Section>
