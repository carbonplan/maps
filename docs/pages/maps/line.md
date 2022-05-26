import Section from '../../components/section'
import Table from '../../components/table'

# Line

The `Line` component renders a Mapbox map layer of `type: 'line'` using vector tiles from the provided `source`.

## Props

<Table>

| Prop             | Description                                                | Default |
| ---------------- | ---------------------------------------------------------- | ------- |
| source           | URL pointing to vector tileset                             |         |
| variable         | Name of `source-layer`                                     |         |
| color            | Line color                                                 |         |
| _optional props_ |                                                            |         |
| opacity          | Line opacity                                               | 1       |
| width            | Line width                                                 | 0.5     |
| blur             | Line blur                                                  | 0.4     |
| maxZoom          | Maximum zoom for layer                                     | 5       |
| id               | Key that triggers addition of source to `mapbox-gl-js` map |         |

</Table>

export default ({ children }) => <Section name='line'>{children}</Section>
