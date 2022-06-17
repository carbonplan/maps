import Section from '../../components/section'
import LoadingDemo from '../../components/examples/loading-demo'
import PropsTable from '../../components/props-table'

# Raster

The `Raster` component is responsible for initializing the `mapbox-gl-js` instance and making this available to any map layers rendered within it.

## Props

<PropsTable name='Raster' />

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
