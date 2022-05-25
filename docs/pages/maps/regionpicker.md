import Section from '../../components/section'
import Table from '../../components/Table'

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

export default ({ children }) => <Section name='regionpicker'>{children}</Section>
