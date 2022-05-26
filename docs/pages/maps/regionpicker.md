import Section from '../../components/section'
import Table from '../../components/table'
import RegionDemo from '../../components/examples/region-demo'

# RegionPicker

The `RegionPicker` component renders a moveable and resizeable circle over the map that can be used to query map data via the `regionOptions.setData` callback passed to `Raster`.

## Props

<Table>

| Prop             | Description                                                                | Default      |
| ---------------- | -------------------------------------------------------------------------- | ------------ |
| color            | Color of circle border, radius guideline, and label                        |              |
| backgroundColor  | Color rendered over area of map not covered by circle (with opacity `0.8`) |              |
| fontFamily       | Font family used to render circle radius label                             |              |
| fontSize         | Font size used to render circle radius label                               |              |
| _optional props_ |                                                                            |              |
| units            | Units used to render circle radius label, one of: 'meters', 'kilometers'   | 'kilometers' |
| initialRadius    | Radius used to initialize circle                                           |              |
| minRadius        | Minimum radius allowed                                                     |              |
| maxRadius        | Maximum radius allowed                                                     |              |

</Table>

## Basic rendering

When `RegionPicker` is rendered within a `Map`, a translucent background is rendered over the entire map to bring the circular region into focus.

```jsx
<Map>
  <RegionPicker
    color={theme.colors.primary}
    backgroundColor={theme.colors.background}
    fontFamily={theme.fonts.mono}
    fontSize={'14px'}
    maxRadius={2000}
  />
  {...otherChildren}
</Map>
```

<RegionDemo />

## Querying Raster data

When a `RegionPicker` is rendered within the same `Map` as a `Raster` layer, the `regionOptions` `setData` prop is invoked whenever the `RegionPicker` is mounted, moved, or resized.

### regionOptions.setData

<RegionDemo showData showToggle />

### regionOptions.selector

For datasets where a `selector` is required to _render_ the data, you have flexibility around how to select into the data returned by region queries. By default, the top-level `selector` for the `Raster` is used. However, a separate `regionOptions.selector` may be used.

For example, given a 3D dataset that contains 12 months of average temperature data, you may want to render just one month of data at a time.To render the first month's data, you would pass `selector={{month: 1}}`. Without specifying another `selector` in `regionOptions`, the returned data would look like

```
{
  value: {
  coordinates: {
    month: [1],
    lat: Array(N),
    lon: Array(N),
  },
  dimensions: ['month', 'lat', 'lon'],
  tavg: Array(N),
}
```

You could instead choose to include all data from all months in the regional query, by setting `regionOptions.selector = {month: [1, 2, ... 12]}`. This would return data that looks like

```
{
  value: {
  coordinates: {
    month: [1, 2, ... 12],
    lat: Array(N),
    lon: Array(N),
  },
  dimensions: ['month', 'lat', 'lon'],
  tavg: {
    1: Array(N),
    2: Array(N),
    ...
    12: Array(N),
  },
}
```

export default ({ children }) => (
  <Section name='regionpicker'>{children}</Section>
)
